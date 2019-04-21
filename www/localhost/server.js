() => {
  return class server {
    constructor(modules) {
      this.modules = modules;
      this.modules.handlebars.registerHelper("syntaxHighlight", obj => {
        var json = JSON.stringify(obj, null, 2);

        json = json
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        var result = json.replace(
          /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
          function (match) {
            var cls = "number";
            if (/^"/.test(match)) {
              if (/:$/.test(match)) {
                cls = "key";
              } else {
                cls = "string";
              }
            } else if (/true|false/.test(match)) {
              cls = "boolean";
            } else if (/null/.test(match)) {
              cls = "null";
            }
            return '<span class="' + cls + '">' + match + "</span>";
          }
        );
        return new modules.handlebars.SafeString(result);
      });
    }

    async start() {
      this.modules.SBC.AuthService.configure({
        username: "",
        password: ""
      });

      if (
        this.modules.SBC.AuthService.options.username &&
        this.modules.SBC.AuthService.options.password
      )
        try {
          await this.modules.SBC.Client.bootstrap({
            services: [
              this.modules.SBC.DataService,
              this.modules.SBC.BusinessService,
              this.modules.SBC.AuthService,
              this.modules.SBC.HttpClientService,
              this.modules.SBC.LocalStorageService
            ],
            logging: "info"
          });

          this.modules.sbc = {
            data: this.modules.SBC.Client.services["DataService"]
          };
        } catch (error) {
          console.log(error);
        }
    }

    async onRequest(req, res , inputs,sitePath) {
      
    }


  };


};
