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
        "../../content/admin/views/"
    ],
    transform: [
        {
            from: "lbl",
            to: "txt"
        },
        {
            from: "Lbl",
            to: "txt"
        },
        {
            from: "error",
            to: "err"
        }
    ],
    types: ["txt", "msg", "btn", "err"],
    defaultType: "txt",
    removeIdentical: false
};