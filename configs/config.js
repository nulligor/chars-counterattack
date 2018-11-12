module.exports = {
    locales: {
        rootPath: "../../content/locales/",
        default: "en.json"
    },
    applyTo: [  
        "../../content/web/views/",
        "../../content/web/public/js/",
        "../../content/web/public/tmp/",
        "../../content/ionic/views/",
        "../../content/ionic/public/js/",
        "../../content/shared/views/",
        "../../content/shared/public/js/",
        "../../test/e2e/",
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
        /(?:title:)+\s*?('(.+?[^\\])'|"(.+?[^\\])")/gi,
        /(?:locale.getValue\()+\s?('(.+?[^\\])'|"(.+?[^\\])")/gi
    ]
};