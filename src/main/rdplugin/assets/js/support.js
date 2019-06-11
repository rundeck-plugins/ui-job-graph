function util_initPage(firsttab, firsttitle, contentid, tabid, tabname, tabcontent, ontabcontent, makefirst, newactive) {
    //find main content
    var newtab;
    var main = jQuery(firsttab);
    var activeOld = newactive ? '' : 'active';
    var activenew = newactive ? 'active' : '';
    var newTabLi = `<li class="${activenew}"><a href="#${contentid}" data-toggle="tab" id="${tabid}">${tabname}</a></li>`;
    if (!main.hasClass('tab-pane')) {
        //add a new tab wrapper
        var tabA = `<li class="${activeOld}"><a href="${firsttab}" data-toggle="tab" id="${firsttab.substr(1)}_tab">${firsttitle}</a></li>`;
        var tabB = newTabLi;
        if (makefirst) {
            var c = tabB;
            tabB = tabA;
            tabA = c;
        }
        let tabs = jQuery(`
<div class="vue-tabs">
<div class="nav-tabs-navigation">
<div class="nav-tabs-wrapper">
<ul class="nav nav-tabs">
${tabA}${tabB}
</ul>
</div>
</div>
<div class="tab-content">
<!-- wraps existing content -->
</div>
</div> `);
        newtab = jQuery(`<div id="${contentid}" class="tab-pane ${activenew}">${tabcontent}</div>`);
        let maintabcontent = tabs.find('.tab-content');
        main.wrap(maintabcontent);
        newtab.insertAfter(main);
        main.addClass('tab-pane ' + activeOld);
        tabs.insertBefore(main.parent());
    } else {
        //update page to add tab
        //find tabs
        let tabs = main.parent().parent().find('.nav.nav-tabs');
        if(tabs.length<1){
            let link = jQuery(`[href="${firsttab}"][data-toggle=tab]`);
            if(link) {
                tabs = link.closest('.nav.nav-tabs');
            }
        }
        if (makefirst) {
            tabs.prepend(newTabLi);
        } else {
            tabs.append(newTabLi);
        }
        newtab = jQuery(`<div id="${contentid}" class="tab-pane">${tabcontent}</div>`);
        newtab.insertAfter(main);
    }
    if (typeof(ontabcontent) === 'function') {
        ontabcontent(newtab[0]);
    }
    return jQuery('#' + tabid);
}

function i18Message(pluginName, code) {
    return message(pluginName+"."+code)
}

function setup_ko_loader(prefix, pluginBase, pluginName) {
    var pluginUrl = _url_path(pluginBase);
    ko.components.loaders.unshift({
        /**
         * create a config for any component starting with the given prefix
         * @param name
         * @param callback
         */
        getConfig: function (name, callback) {
            if (!name.startsWith(prefix + '-')) {
                callback(null);
                return;
            }
            var file = name.substring(prefix.length + 1);
            var fullUrl = pluginUrl + '/html/' + file + ".html";
            callback({
                template: {
                    pluginUrl: fullUrl,
                    pluginName: pluginName
                }
            });
        },

        /**
         * Load a template given a pluginUrl
         * @param name
         * @param templateConfig
         * @param callback
         */
        loadTemplate: function (name, templateConfig, callback) {
            if (!templateConfig.pluginUrl) {
                // Unrecognized config format. Let another loader handle it.
                callback(null);
                return;
            }
            jQuery.get(templateConfig.pluginUrl, function (markupString) {
                markupString = markupString.replace(/\$\$([\$\w\.\(\)\+]+)/g, function (match, g1) {
                    return "<span data-bind=\"text: " + g1 + "\"></span>";
                }).replace(/%{2}([^<>]+?)%{2}/g, function (match, g1) {
                    return "<span data-bind=\"ui-jobgraphPluginMessage: '" + (templateConfig.pluginName || 'true') + "'\">" + g1 + "</span>";
                });
                ko.components.defaultLoader.loadTemplate(name, markupString, callback);
            });
        }
    });
    //define component name based on tag name for using custom tags
    var origGetComponentNameForNode = ko.components.getComponentNameForNode;
    ko.components.getComponentNameForNode = function (node) {
        var orig = origGetComponentNameForNode(node);
        if (null != orig) {
            return orig;
        }
        var tagNameLower = node.tagName && node.tagName.toLowerCase();

        if (tagNameLower.startsWith(prefix + '-')) {
            return tagNameLower;
        }
        return null;
    }

}

function jobgraph_load_messages_async(pluginName, plugini18nBase, path) {
    return jQuery.ajax({
        url: plugini18nBase + '/' + path + '?format=json',
        success: function (data) {
            if (typeof(window.Messages) != 'object') {
                window.Messages = {};
            }
            jQuery.extend(window.Messages, data);
        }
    });
}

function jobgraph_init_plugin(pluginName, callback) {
    console.log("init")
    //_plugins.push(function () {
        //rdpro_setup_ko_extenders();
        jobgraph_load_messages_async(pluginName, _url_path(rundeckPage.pluginBasei18nUrl(pluginName)), "i18n/messages.properties")
            .then(callback, callback);
    //});
}

function _url_path(baseUrl) {
    if (baseUrl.indexOf('/') == 0) {
        return baseUrl;
    }
    if (baseUrl.toLowerCase().indexOf('http') == 0) {
        var len = baseUrl.indexOf('://');
        if (len > 0) {
            var absurl = baseUrl.substring(len + 3);
            if (absurl.indexOf('/') >= 0) {
                absurl = absurl.substring(absurl.indexOf('/'));
                absurl = absurl.replace(/^\/+/, '/');
                return absurl;
            } else {
                return '';
            }
        }
    }
}

