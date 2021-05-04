/* 
Impftermin Widget
v 1.3.1 EOL des Projektes

This Scriptable Widget will show you if there are any "Vermittlungscode" for vaccination appointments available.
The data is pulled from the impfterminservice.de api, which is neither publicly available nor documented.
Therefore everything may break.

The newest version, issues, etc. of this widget can be found here: https://github.com/not-a-feature/impfWidget
A gist version is also available: https://gist.github.com/not-a-feature/4e6dbbd9eb3bd927e50cae347b7e0486/

The framework/skeleton of this script was created by marco79cgn for the toiletpaper-widget
(https://gist.github.com/marco79cgn/23ce08fd8711ee893a3be12d4543f2d2)

To uses this widget go to https://003-iz.impfterminservice.de/assets/static/impfzentren.json and search for
your local center. Copy the whole text in between the two curly brackets and paste it below in the settings (Starting at line 55).

If you want a notification change the NOTIFICATION_LEVEL to 
0: no notification
1: only if vaccines are available
2: every time the widget refreshes

If you want to know if there are appointments specifically for a vaccine,
set DISPLAY_VACCINES_AS_ONE to false. This requires a medium size-widget (2x1)

If you want to exclude specific vaccines, set them to inside the VACCINES variable to false. 

Thats it. You can now run this script.
Copy the source, open the scriptabel app, add the source there. 
go the home screen, add scriptable widget

-------------------------------------------------------------------------------
LICENSE:
Copyright (C) 2021 by Jules Kreuer - @not_a_feature
This piece of software is published unter the GNU General Public License v3.0

TLDR:
| Permissions      | Conditions                   | Limitations |
| ---------------- | ---------------------------- | ----------- |
| ✓ Commercial use | Disclose source              | ✕ Liability |
| ✓ Distribution   | License and copyright notice | ✕ Warranty  |
| ✓ Modification   | Same license                 |             |
| ✓ Patent use     | State changes                |             |
| ✓ Private use    |                              |             |

Go to https://github.com/not-a-feature/impfWidget/blob/main/LICENSE to see the full version.
------------------------------------------------------------------------------- */

//-----------------------------------------------------------------------------
// Settings

// Replace this with the data of you local center
const CENTER = {
    "Zentrumsname": "Sachsen",
    "PLZ": "01129",
    "Ort": "Dresden",
    "Bundesland": "Sachsen",
    "URL": "https://www.startupuniverse.ch/api/1.1/de/counters/getAll/_iz_sachsen",
    "Adresse": "Messering 1"
 }

// adjust to your desired level
const NOTIFICATION_LEVEL = 1

// Set to false, if a detailed view is wanted.
// Attention! This requires a medium size-widget (2x1)
const DISPLAY_VACCINES_AS_ONE = true 

// Advanced Setting
// Fetch status of following vaccines, set to false to ignore this vaccine
const VACCINES = [{"name": "BioNTech",    "ID": "L920", "allowed": true},
                  {"name": "Moderna",     "ID": "L921", "allowed": true},
                  {"name": "AstraZeneca", "ID": "L922", "allowed": true}]

// END Setting
//-----------------------------------------------------------------------------
const vaccineTextFontSize = 13
const appointmentsTextFontSize = 22
const detailTextFontSize = 17
const textColorRed   = new Color("#E50000")
const textColorGreen = new Color("#00CD66")


const widget = new ListWidget()
widget.url = CENTER["URL"]
const openAppointments  = await fetchOpenAppointments()
await createNotification()
await createWidget()

if (!config.runsInWidget) {
    if (DISPLAY_VACCINES_AS_ONE) {
        await widget.presentSmall()
    }
    else {
        await widget.presentMedium()
    }
}
Script.setWidget(widget)
Script.complete()

/* create Widget

case: smallWidget (DISPLAY_VACCINES_AS_ONE == true)
topRow:     | leftColumn |  rightColumn  |
            |            |   IMPFUNGEN   | 
            | icon       | Keine/Termine |

bottomRow:  | Location                   |

case: mediumWidget (DISPLAY_VACCINES_AS_ONE == false)
topRow:     | leftColumn |  rightColumn  | detailColumn |
            |            |   IMPFUNGEN   | BioNTech     |
            | icon       | Keine/Termine | Moderna...   |

bottomRow:  | Location                                  |
*/

/*
Create widget using current information
*/
async function createWidget() {

    widget.setPadding(10, 10, 10, 10)
    const icon = await getImage('vaccine')
    let topRow = widget.addStack()
    topRow.layoutHorizontally()

    let leftColumn = topRow.addStack()
    leftColumn.layoutVertically()
    leftColumn.addSpacer(vaccineTextFontSize)
    const iconImg = leftColumn.addImage(icon)
    iconImg.imageSize = new Size(40, 40)

    topRow.addSpacer(vaccineTextFontSize)

    let rightColumn = topRow.addStack()
    rightColumn.layoutVertically()
    const vaccineText = rightColumn.addText("IMPFUNGEN")
    vaccineText.font = Font.mediumRoundedSystemFont(vaccineTextFontSize)

    let openAppointmentsText
    let textColor = textColorRed
    if (openAppointments.hasOwnProperty("error")) {
        openAppointmentsText = "⚠️ " + openAppointments["error"]
    }
    else if (Object.values(openAppointments).includes(true)) {
        openAppointmentsText = "Freie\nTermine"
        textColor = textColorGreen
    }
    else {
        openAppointmentsText = "Keine\nTermine"
    }
    let openAppointmentsTextObj = rightColumn.addText(openAppointmentsText)

    openAppointmentsTextObj.font = Font.mediumRoundedSystemFont(appointmentsTextFontSize)
    openAppointmentsTextObj.textColor = textColor
    

    if(!DISPLAY_VACCINES_AS_ONE) {
        topRow.addSpacer(8)

        let detailColumn = topRow.addStack()
        detailColumn.layoutVertically()
        openAppointmentsDetail = {}
        Object.keys(openAppointments).forEach((key, index) => {
            openAppointmentsDetail[key] = detailColumn.addText(key)
            openAppointmentsDetail[key].font = Font.mediumRoundedSystemFont(detailTextFontSize)
            if (openAppointments[key]) {
                openAppointmentsDetail[key].textColor = textColorGreen 
            }
            else {
                openAppointmentsDetail[key].textColor = textColorRed 
            }
        })
    }

    widget.addSpacer(4)

    const bottomRow = widget.addStack()
    bottomRow.layoutVertically()
    // Replacing long names with their abbrehivations 
    let shortName = CENTER["Zentrumsname"]
    shortName = shortName.replace("Zentrales Impfzentrum", "ZIZ")
    shortName = shortName.replace("Zentrales Impfzentrum (ZIZ)", "ZIZ")
    shortName = shortName.replace("Landkreis", "LK")
    shortName = shortName.replace("Kreisimpfzentrum", "KIZ")
    shortName = shortName.replace("Impfzentrum Kreis", "KIZ")
    shortName = shortName.replace("Impfzentrum Landkreis", "KIZ")

    
    const street = bottomRow.addText(shortName)
    street.font = Font.regularSystemFont(11)

    const zipCity = bottomRow.addText(CENTER["Adresse"] + ", " + CENTER["Ort"])
    zipCity.font = Font.regularSystemFont(11)
}

/*
Create notification if turned on
*/
async function createNotification() {
    if (NOTIFICATION_LEVEL > 0) {
        const notify = new Notification();
        notify.sound = "default";
        notify.title = "ImpfWidget";
        notify.openURL = CENTER["URL"];
        if (Object.values(openAppointments).includes(true)) {
            notify.body = "💉 Freie Termine"
            notify.schedule();
            return;
        }
        else if (openAppointments.hasOwnProperty("error")) {
            notify.body = "⚠️ " + openAppointments["error"]
            notify.schedule();
            return;
        }
        else if (NOTIFICATION_LEVEL == 2) {
            notify.body = "🦠 Keine Termine"
            notify.schedule();
            return;
        }
    }
}


/* 
Fetches open appointments
Returns object e.g:
   {"BioNTech": true, "Monderna": false}
or {"Error": "Error message"}
*/
async function fetchOpenAppointments() {
    let url = CENTER["URL"]
    let result = {}
    console.log(VACCINES)
    // Case if all vaccines are displayed as one
    if (DISPLAY_VACCINES_AS_ONE) {
        let req = new Request(url)
        let obj = await req.loadJSON()

        var sum = 0
        for (iz in obj.response.data){
         //tmp = tmp + obj.response.data[iz].name;
         sum = sum + Number(obj.response.data[iz].counteritems[0].val);
        }
        if (sum > 0){
          result[VACCINES[0]["name"]] = true
        }
        else{
          result[VACCINES[0]["name"]] = false
        }
    }
    // Case if all vaccines are displayed one by one
    else {
        for (var i = 0; i < VACCINES.length; i++) {
            if (VACCINES[i]["allowed"]) {
                console.log("Checking Vaccine: " + VACCINES[i]["name"])
                let req = new Request(url + VACCINES[i]["ID"])
                let body = await req.loadString()
                if (body == '{"termineVorhanden":false}') {
                    result[VACCINES[i]["name"]] = false
                }
                else if (body == '{"termineVorhanden":true}') {
                    result[VACCINES[i]["name"]] = true
                }
                else if (body == '{"error":"Postleitzahl ungueltig"}') {
                    return {"error": "Wrong PLZ"}
                }
                else {
                    return {"error": "Error"}
                }
            }
        }
    }
    console.log(result)
    return result
}


// get images from local filestore or download them once
async function getImage(image) {
    let fm = FileManager.local()
    let dir = fm.documentsDirectory()
    let path = fm.joinPath(dir, image)
    if (fm.fileExists(path)) {
        return fm.readImage(path)
    } else {
        // download once, save in local storage
        let imageUrl
        switch (image) {
            case 'vaccine':
                imageUrl = "https://api.juleskreuer.eu/syringe-solid.png"
                break
            default:
                console.log(`Sorry, couldn't find ${image}.`);
        }
        let iconImage = await loadImage(imageUrl)
        fm.writeImage(path, iconImage)
        return iconImage
    }
}

// helper function to download an image from a given url
async function loadImage(imgUrl) {
    const req = new Request(imgUrl)
    return await req.loadImage()
}
