jQuery(function () {
    console.log("initting job graph plugin")
    if (typeof(RDPLUGIN) != 'object') {
        window.RDPLUGIN = {};
    }
    RDPLUGIN['job-graph'] = "@name@";
});