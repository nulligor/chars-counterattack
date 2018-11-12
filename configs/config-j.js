module.exports = {
    locales: {
        rootPath: "../../content/locales/",
        default: "en.json"
    },
    applyTo: [  
        "../../content/web/views/",
        "../../content/web/public/js/",
        "../../content/web/public/tmp/",
        "../../content/mobile/views/",
        "../../content/mobile/public/js/",
        "../../content/mobile/public/tmp/",
        "../../content/shared/public/js/",
        "../../content/admin/js/",
        "../../content/admin/views/",
        "../../content/admin/ionicAdmin/views/"
    ],
    transform: [
        {
            from: "lbl",
            to: "txt"
        },
        {
            from: "error",
            to: "err"
        }
    ],
    types: ["txt", "msg", "btn", "err"],
    defaultType: "txt",
    removeIdentical: false,
    forceCheck: [
       /(?:(?:[\{]\s|[\|]\s))('(.+?[^\\])'|"(.+?[^\\])")(?:\s*\|\s*i18n)/gi,
       /(?:translateStrings\()+\s?('(.+?[^\\])'|"(.+?[^\\])")/gi,
       /(?:translateStringsTitle\()+\s?('(.+?[^\\])'|"(.+?[^\\])")/gi,
       /(?:101:)+\s*?('(.+?[^\\])'|"(.+?[^\\])")/gi,
       /(?:500:)+\s*?('(.+?[^\\])'|"(.+?[^\\])")/gi,
       /(?:400:)+\s*?('(.+?[^\\])'|"(.+?[^\\])")/gi,
       /(?:100:)+\s*?('(.+?[^\\])'|"(.+?[^\\])")/gi,
       /(?:notificationSrvc.showNotification\()+\s?('(.+?[^\\])'|"(.+?[^\\])")/gi,
       /(?:notifyUserSrvc.showErrorMessage\()+\s?('(.+?[^\\])'|"(.+?[^\\])")/gi,
       /(?:scope.\$emit\(\"jobsite.showNotification\"\,)+\s?('(.+?[^\\])'|"(.+?[^\\])")/gi,
       /(?:(?:[\{]\s|[\|]\s))(.+?)('(.+?[^\\])'|"(.+?[^\\])")(.+?)(?:\s*\|\s*i18n)/gi
    ]
};