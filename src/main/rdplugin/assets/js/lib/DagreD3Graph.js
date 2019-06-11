function DagreD3Graph(opts) {
    var self = this;
    self.selector = ko.observable(opts.selector || 'svg');
    self.zoom = ko.observable(null != opts.zoom ? opts.zoom : true);
    self.graphRankLR = ko.observable(!opts || opts.graphRankDir== 'LR');
    self.graphRankDir = ko.computed(function(){
        if(self.graphRankLR()){
            return 'LR';
        }
        return 'TB';
    });
    self.nodes = ko.observableArray();
    self.edges = ko.observableArray();

    self.configureD3 = function (g) {
        //add nodes
        ko.utils.arrayForEach(self.nodes(), function (node) {
            "use strict";
            g.setNode(node.id, node.data);
        });

        g.nodes().forEach(function (v) {
            var node = g.node(v);
            node.rx = node.ry = 5;
        });

        ko.utils.arrayForEach(self.nodes(), function (node) {
            "use strict";
            if (node.parent) {
                g.setParent(node.id, node.parent);
            }
        });


        //add edges
        ko.utils.arrayForEach(self.edges(), function (edge) {
            "use strict";
            g.setEdge(edge.id, edge.target, edge.data);
        });
    };
    self.render = function () {
        var g = new dagreD3.graphlib.Graph({compound: true});
        g.setGraph({});
        g.setDefaultEdgeLabel(function () {
            return {};
        });

        self.configureD3(g);

        g.graph().rankdir = self.graphRankDir() || 'LR';

        // Create the renderer
        var render = new dagreD3.render();

        var svg = d3.select(self.selector()),
            inner = svg.select("g");

        g.graph().transition = function (selection) {
            return selection.transition().duration(500);
        };


        render(inner, g);
        const max = {x: jQuery(window).width(), y: jQuery(window).height()}
        const min = {x: 256, y: 256}
        let gH = g.graph().height
        let gW = g.graph().width
        svg.attr("height", Math.max(min.y, Math.min(max.y, gH)) + 40)
        let svgW = jQuery(self.selector()).width()
        let svgH = jQuery(self.selector()).height()
        let xpad = 100, ypad = 25
        if (gW > svgW) {
            xpad += (gW - svgW)
        }
        if (gH > svgH) {
            ypad += (gH - svgH)
        }
        // Center the graph
        var xCenterOffset = (svgW - gW) / 2
        var yCenterOffset = (svgH - gH) / 2
        if (self.zoom()) {
            const w = gW
            const h = svgH
            var zoom = d3.zoom()
                .scaleExtent([0.25, 3])
                .translateExtent([[-100, -25], [w + xpad, h + ypad]])
                .on("zoom", () => {
                inner.attr("transform", d3.event.transform)
            })
            svg.call(zoom)
            zoom.translateTo(svg, xCenterOffset, yCenterOffset)

        } else {
            inner.attr("transform", `translate(${xCenterOffset}, ${yCenterOffset})`)
        }
    };
}