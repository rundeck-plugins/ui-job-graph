//= require lib/DagreD3Graph
//= require lib/support

jQuery(function () {
  "use strict";
  var project = rundeckPage.project();
  var pagePath = rundeckPage.path();
  var pluginName = RDPLUGIN['job-graph'];
  var pluginBase = rundeckPage.pluginBaseUrl(pluginName);

  function JobGraph(data) {
    var self = this;
    /**
     * Link to jobfavorites
     */
    self.jobfavorites = ko.observable();
    /**
     * Link to jobdashboard
     */
    self.jobdashboard = ko.observable();
    self.jobset = data && data.jobset || [];
    self.jobnames = {};
    self.showConditionals = ko.observable(!data || data.showConditionals == 'true');
    self.showErrorHandlers = ko.observable(!data || data.showErrorHandlers == 'true');

    self.doTruncate = ko.observable(false);
    self.jobfavsOnly = ko.observable(false);
    self.colorize = ko.observable(false);
    self._truncate = function (len, str) {
      if (self.doTruncate()) {
        var newstr = str;
        if (newstr.length > len) {
          newstr = newstr.substring(0, len) + '...';
        }
        return newstr;
      }
      return str;
    };
    self.graph = new DagreD3Graph({
      selector: 'svg#ui-jobgraph-svg-canvas',
      graphRankDir: 'LR'
    });
    self.renderGraph = function () {
      var jobs = self.jobset;
      var jobfavids = (self.jobfavorites() && self.jobfavorites().favsonly()) && self.jobfavorites().favjoblist() || null;
      var jobdashmap = (self.colorize() && self.jobdashboard() && self.jobdashboard().jobmap);

      var nodes = [];
      var edges = [];

      jobs.forEach(function (j) {
        if (null != jobfavids && jobfavids.indexOf(j.id) < 0) {
          //skip job
          return;
        }
        var name = self._truncate(20, j.name || j.id);
        var steplabels = [];
        j.steps.forEach(function (l) {
          steplabels.push(self._truncate(20, l));
        });
        var desc = '';
        if (steplabels.length > 0) {
          desc += '<ol><li>' + steplabels.join('</li><li>') + '</li></ol>';
        }
        var nodedata = {
          label: '<h3>' + name + '</h3>' + desc,
          labelType: 'html'
        };
        if (j.notfound) {
          nodedata['class'] = 'notfound';
        } else if (self.colorize() && jobdashmap && jobdashmap[j.id] && jobdashmap[j.id].forecast()) {
          nodedata['class'] = 'weather_' + jobdashmap[j.id].forecast();
        } else {
          nodedata['class'] = 'no_weather';
        }
        nodes.push({
          id: j.id,
          data: nodedata
        });

      });
      jobs.forEach(function (j) {

        if (null != jobfavids && jobfavids.indexOf(j.id) < 0) {
          //skip job
          return;
        }
        var jobedges = {};
        j.refs.forEach(function (ref) {
          if (!ref['id'] && ref.refname) {
            ref['id'] = self.jobnames[ref.refname];
          }
          if (!ref['id']) {
            return;
          }
          if (null != jobfavids && jobfavids.indexOf(ref.id) < 0) {
            //skip ref
            return;
          }
          if (!self.showConditionals() && ref.conditional) {
            return;
          }
          if (!self.showErrorHandlers() && ref.errorhandler) {
            return;
          }
          if (jobedges[ref.id]) {
            var labeldata = jobedges[ref.id];
            labeldata.label += "\n" + ref.label;

            return;
          }
          var labeldata = {
            label: ref.label,
            labelStyle: ref.label ? "" : "fill: #888;"
          };
          if (ref.missing) {
            labeldata.class = 'missing_ref';
            labeldata.labelStyle = "fill: #f88;";
            labeldata.arrowheadClass = 'arrowhead_missing_ref';
          } else if (ref.conditional) {
            labeldata.class = 'conditional_ref';
            labeldata.labelStyle = "fill: #080;";
            labeldata.arrowheadClass = 'arrowhead_conditional_ref';
          } else if (ref.errorhandler) {
            labeldata.class = 'ehandler_ref';
            labeldata.labelStyle = "fill: #f80;";
            labeldata.arrowheadClass = 'arrowhead_ehandler_ref';
          }
          if (j.id == ref.id) {
            labeldata.lineInterpolate = 'basis';
          }

          jobedges[ref.id] = labeldata;
        });
        for (var obj in jobedges) {
          edges.push({
            id: j.id,
            target: obj,
            data: jobedges[obj]
          });
        }
      });

      self.graph.nodes(nodes);
      self.graph.edges(edges);
      self.graph.render();
    };;
    //when rankdir changes, rerender the graph;
    self.graph.graphRankLR.subscribe(self.renderGraph);
    self.showConditionals.subscribe(self.renderGraph);
    self.showErrorHandlers.subscribe(self.renderGraph);
    self.doTruncate.subscribe(self.renderGraph);
    self.colorize.subscribe(self.renderGraph);

    self.registerJobFavorites = function (jobfavorites) {
      self.jobfavorites(jobfavorites);
      jobfavorites.favsonly.subscribe(self.jobfavsOnly);
      self.jobfavsOnly(jobfavorites.favsonly());
      self.jobfavsOnly.subscribe(self.renderGraph);
    };
    self.onLoadedJobFavoritesEvent = function (evt) {
      self.registerJobFavorites(evt.relatedTarget);
    };
    self.registerJobDashboard = function (jobdashboard) {
      self.jobdashboard(jobdashboard);
    };
    self.onLoadedJobDashboardEvent = function (evt) {
      self.registerJobDashboard(evt.relatedTarget);
    };
    self.loadJobsListPage = function () {
      //find main content
      setup_ko_loader('ui-job-graph', pluginBase, pluginName);
      var tab = util_initPage(
        '#indexMain',
         i18Message(pluginName, 'Jobs'),
        'ui-jobgraph',
        'ui-jobgraphtab',
        i18Message(pluginName, 'Graph'),
        '<ui-job-graph-graph params="jobgraph: $data"></ui-job-graph-graph>',
        function (tab) {
          ko.applyBindings(self, tab);
        }
      );
      jQuery(tab).on('shown.bs.tab', function () {
        var foundJobs = jQuery('.jobname[data-job-id]');
        var joblist = ko.utils.arrayMap(foundJobs, function (el) {
          var jobid = jQuery(el).data('jobId');
          var jobname = jQuery(el).data('jobName');
          var jobgroup = jQuery(el).data('jobGroup');
          return {
            id: jobid,
            name: jobname,
            group: jobgroup
          };
        });
        var maxWidth = jQuery('.card-content').width();
        loadJobListData(joblist, function () {
          jQuery("#ui-jobgraph").resizable({
            ghost: true,
            alsoResize: "#ui-jobgraph-svg-canvas",
            maxWidth: maxWidth
          });
          jobGraph.renderGraph();
        });
      });

      if (window.favjobs) {
        self.registerJobFavorites(window.favjobs);
        //force move of controls to tabbar if already loaded
        window.favjobs.addControlsToPage();
      } else {
        jQuery(document).on('loaded.rundeck.plugin.jobfavorites', self.onLoadedJobFavoritesEvent);
      }

      if (window.joblistview) {
        self.registerJobDashboard(window.joblistview);
      } else {
        jQuery(document).on('loaded.rundeck.plugin.joblist', self.onLoadedJobDashboardEvent);
      }
    };
    self.loadJobShowPage = function () {
      //find main content
      setup_ko_loader('ui-job-graph', pluginBase, pluginName);

      var tab = util_initPage(
        '#detailtable',
          i18Message(pluginName, 'Detail'),
        'ui-jobgraph',
        'ui-jobgraphtab',
          i18Message(pluginName, 'Dependency.Graph'),
        '<ui-job-graph-graph params="jobgraph: $data"></ui-job-graph-graph>',
        function (tab) {

          ko.applyBindings(self, tab);
        }
      );

      jQuery(tab).on('shown.bs.tab', loadJobShowPageData);
      if(jQuery(tab).closest('li').hasClass('active')){
        loadJobShowPageData()
      }

    };

    self.printChart = function () {
      var svgElement = document.getElementById("ui-jobgraph-svg-canvas")
      var cssFile = readCSSFile(window._rundeck.rdBase + 'plugin/file/UI/ui-job-graph/css/ui-jobgraph.css')
      var injectedCSS = document.createElement('style')
      injectedCSS.type = "text/css"
      injectedCSS.innerHTML = cssFile

      svgElement.insertBefore(injectedCSS, svgElement.childNodes[0])

      var svgData = new XMLSerializer().serializeToString(svgElement);

      var svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8"
      });
      var svgUrl = URL.createObjectURL(svgBlob);
      var downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = document.title + ".svg";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

    };
  }

  function readCSSFile(file) {

    var rawFile = new XMLHttpRequest();
    var allText = '';
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = function () {
      if (rawFile.readyState === 4) {
        if (rawFile.status === 200 || rawFile.status == 0) {
          allText = rawFile.responseText;
        }
      }
    };
    rawFile.send(null);
    return allText;
  }

  function _wfTypeForStep(step) {
    "use strict";
    if (typeof (step) != 'undefined') {
      if (step['exec']) {
        return 'command';
      } else if (step['jobref']) {
        return 'job';
      } else if (step['script']) {
        return 'script';
      } else if (step['scriptfile']) {
        return 'scriptfile';
      } else if (step['scripturl']) {
        return 'scripturl';
      } else if (step['type']) { //plugin
        if (step['type'] == 'job-state-conditional') {
          return 'job state conditional';
        }
        return step['type'];
      }
    }
    return 'console';
  }

  function JobDataLoader() {
    var self = this;
    self.jobdata = {};
    self.undefjobs = {};
    self.undef = 0;
    self.count = 0;
    self.loadJobData = function (jobid, jobgroup, jobname, data, extralist) {
      var loaded = 0;
      self.jobdata[jobid] = data.workflow;

      var thisrefname = (jobgroup ? jobgroup + '/' : '') + jobname;
      if (!jobGraph.jobnames[thisrefname]) {
        jobGraph.jobnames[thisrefname] = jobid;
      }
      var jobrefs = [];
      var ehjobrefs = [];
      var steps = [];
      for (var x = 0; x < data.workflow.length; x++) {
        var step = data.workflow[x];
        var jobref = step['jobref'];
        if (step['description']) {
          steps.push(step['description']);
        } else if (jobref) {
          steps.push(jobref['name']);
        } else {
          steps.push(_wfTypeForStep(step));
        }
        var missing = false;
        if (jobref) {
          var refname = (jobref['group'] ? jobref['group'] + '/' : '') + jobref['name'];
          var id = step.jobId || jobGraph.jobnames[refname];
          var slabel = step['description'] ? ((x + 1) + '. ' + step['description']) : ('Step ' + (x + 1));
          if (!step.jobId) {
            missing = true;
            if (!self.undefjobs[refname]) {
              id = 'undef_' + (++self.undef);
              self.undefjobs[refname] = id;
            } else {
              id = self.undefjobs[refname];
            }
            //add node for undefined job reference
            jobGraph.jobset.push({
              id: id,
              name: steps[x],
              steps: [],
              refs: [],
              erefs: [],
              notfound: true
            });
          }
          jobrefs.push({
            id: id,
            num: x,
            label: slabel,
            nodeStep: step['nodeStep'],
            missing: missing
          });
          if (step.workflow && step.jobId) {
            //discover for subjob
            if (!self.jobdata[step.jobId]) {
              loaded += self.loadJobData(step.jobId, jobref.group, jobref.name, step, extralist);
            }
          } else if (step.jobId) {
            //need to load step
            extralist.push({
              id: step.jobId,
              name: jobref.name,
              group: jobref.group
            });
          }
        }

        if (step.ehJobId) {
          if (step.ehWorkflow) {
            //discover for subjob
            if (!self.jobdata[step.ehJobId]) {
              var stepdata = {
                workflow: step.ehWorkflow
              };
              loaded += self.loadJobData(step.ehJobId, step.errorhandler.jobref.group, step.errorhandler.jobref.name, stepdata, extralist);
            }
          } else {
            //need to load step
            extralist.push({
              id: step.ehJobId,
              group: step.errorhandler.jobref.group,
              name: step.errorhandler.jobref.name
            });
          }
          //errorhandler job id
          jobrefs.push({
            errorhandler: true,
            id: step.ehJobId,
            num: x,
            label: (x + 1) + ". error handler"
          });
        }
      }
      jobGraph.jobset.push({
        id: jobid,
        name: jobname,
        steps: steps,
        refs: jobrefs,
        erefs: ehjobrefs
      });
      loaded++;
      return loaded;
    };

    self.load = function (id) {
      return jQuery.ajax({
        url: "/api/" + appLinks.api_version + "/job/" + id + "/workflow",
        method: 'GET',
        contentType: 'json'
        // success:function(data){ }
      });
    };
    self.find = function (group, name) {
      return jQuery.ajax({
        url: "/api/" + appLinks.api_version + "/" + project + "/jobs?jobExactFilter=" + name + "&groupPathExact=" + group,
        method: 'GET',
        contentType: 'json'
        // success:function(data){ }
      });
    };

  }

  function loadJobShowPageData() {
    var jobDetail = loadJsonData('jobDetail');
    var maxWidth = jQuery('.card-content').width();
    loadJobListData([jobDetail], function () {
      jQuery("#ui-jobgraph").resizable({
        ghost: true,
        alsoResize: "#ui-jobgraph-svg-canvas",
        maxWidth: maxWidth
      });
      jobGraph.renderGraph();
    });
  }

  /**
   * @param {string} jobDataSelector
   */
  function loadJobListData(joblist, finalizer) {
    //list all jobs
    var loader = new JobDataLoader();

    ko.utils.arrayForEach(joblist, function (val) {
      jobGraph.jobnames[(val.group ? val.group + '/' : '') + val.name] = val.id;
    });
    var loadNextJob = function (final) {
      if (joblist.length < 1) {
        final();
        return;
      }
      var el = joblist.splice(0, 1)[0];
      var jobid = el.id;
      var jobgroup = el.group;
      var jobname = el.name;
      if (el.refname) {
        var x = el.refname.lastIndexOf('/');
        jobgroup = el.refname.substring(0, x);
        jobname = el.refname.substring(x + 1);
      } else {
        el.refname = (jobgroup ? jobgroup + '/' : '') + jobname;
      }
      if (!jobid) {
        jobid = jobGraph.jobnames[el.refname];
        if (!jobid) {
          var refname = el.refname;
          loader.find(jobgroup, jobname).success(function (data) {
            if (data && data.length == 1) {
              var jobobj = data[0];
              var jid = jobobj.id;
              loader.load(jid).success(function (data2) {
                var count = loader.loadJobData(jid, jobgroup, jobname, data2, joblist);
                loadNextJob(final)
              });
            }
          });
        }
      } else if (loader.jobdata[jobid] == null) {
        loader.load(jobid).success(function (data) {
          var count = loader.loadJobData(jobid, jobgroup, jobname, data, joblist);
          loadNextJob(final)
        });
      } else {
        loadNextJob(final);
      }
    };
    loadNextJob(finalizer);
  }

  if (pagePath == 'menu/jobs') {
    var jobGraph = window.jobGraph = new JobGraph();
    //rdpro_init_plugin(pluginName, jobGraph.loadJobsListPage);
    jobgraph_init_plugin(pluginName, jobGraph.loadJobsListPage);
  } else if (pagePath == 'scheduledExecution/show') {
    var jobGraph = window.jobGraph = new JobGraph();
    //rdpro_init_plugin(pluginName, jobGraph.loadJobShowPage);
    jobgraph_init_plugin(pluginName, jobGraph.loadJobShowPage);
  }
});
