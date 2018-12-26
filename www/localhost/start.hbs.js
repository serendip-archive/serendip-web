
/// <reference path="serendip.d.ts" />

async () => {



    Modules.handlebars.registerHelper("syntaxHighlight", (obj) => {

        var json = JSON.stringify(obj, null, 2);


        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        var result = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
        return new Modules.handlebars.SafeString(result);
    });

    return {
        handlebars: Modules.handlebars,
        model: {
            title: 'Serendip web server',
            description: "It's a lightweight web server for creating websites using handlebars and javascript."
        }
    };

};
