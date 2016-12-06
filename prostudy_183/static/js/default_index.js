// Create by Weikai Wu
// Local client to communicate with the server

// function app
// execute when the page starts
var app = function () {
    var self = {};

    Vue.config.silent = false; // show all warnings

    self.task_exists = function (task_name) {
        var b = false;
        for (var i = 0; i < self.vue.tasks.length; i++) {
            if (self.vue.tasks[i].name == task_name) {
                b = true;
                break;
            }
        }
        return b;
    };

    self.add_task = function () {
        if (self.vue.is_counting_down) { // you can't add a task while counting down
            $.post(add_conflict_url, function () {
            });
        }
        else if (self.vue.form_task) { // if duplicated task
            if (self.task_exists(self.vue.form_task)) {
                $.post(dup_task_url, function () {
                })
            }
            else if (self.vue.logged_in) {
                // $.post() function takes 3 params: an url, an object, and a function
                // add_task_url is defined in index.html, take a look at it
                /* in this case, $.post() sent an object has 3 fields: task_category, task_content, and task_time to the
                 add_task() function in api.py. if add_task() in api.py successfully returns, execute the function
                 specified by the 3rd param of $.post().*/
                $.post(add_task_url,
                    {
                        task_category: self.vue.form_category,
                        task_content: self.vue.form_task,
                        task_time: self.vue.form_time
                    },
                    function (data) { // param data is returned by the python function in api.py
                        self.vue.tasks.unshift({
                            id: data.id,
                            cate: data.cate,
                            name: data.name,
                            time: data.time,
                            time_t: data.time
                        });
                        if (self.vue.has_more_tasks) {
                            self.get_tasks();
                        }
                    });
            }
            else { // not logged in
                // don't connect to the server and store everything locally
                self.vue.tasks.unshift({
                    id: self.vue.idx,
                    name: self.vue.form_task,
                    cate: self.vue.form_category,
                    time: self.vue.form_time * 60
                });
                self.vue.idx = self.vue.idx + 1;
            }
        }
        else { // empty form
            // send to default.py to flash out "Please enter a task" message
            $.post(empty_form_url, function () {
            })
        }
        self.vue.form_task = null;
        self.vue.form_time = 25;
        self.vue.form_category = 'p';
        self.vue.is_adding_task = false;
        setTimeout(function () {
            self.vue.is_adding_task = true;
            $("#vue-div").show();
        }, 1);
        $("#vue-div").show();
    };


    self.get_tasks = function () {
        var start_idx = 0;
        var end_idx = 4;
        $.getJSON(get_tasks_url,
            {
                start_idx: start_idx,
                end_idx: end_idx
            },
            function (data) {
                self.vue.logged_in = data.logged_in;
                self.vue.has_more_tasks = data.has_more_tasks;
                self.vue.tasks = data.tasklist;
                self.vue.current_user_email = data.current_usr_email;
            });

    };


    self.get_records = function () {
        var start_idx = 0;
        var end_idx = 4;
        $.getJSON(get_records_url,
            {
                start_idx: start_idx,
                end_idx: end_idx
            },
            function (data) {
                self.vue.logged_in = data.logged_in;
                self.vue.has_more_records = data.has_more_records;
                self.vue.records = data.recordlist;
                self.vue.current_user_email = data.current_usr_email;
            })
    };

    self.extend = function (a, b) {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    };

    self.get_more_tasks = function () {
        var start_idx = self.vue.tasks.length;
        var end_idx = start_idx + 4;
        $.getJSON(get_tasks_url,
            {
                start_idx: start_idx,
                end_idx: end_idx
            },
            function (data) {
                self.vue.has_more_tasks = data.has_more_tasks;
                self.extend(self.vue.tasks, data.tasklist);
            });
    };

    self.get_more_records = function () {
        var start_idx = self.vue.records.length;
        var end_idx = start_idx + 4;
        $.getJSON(get_records_url,
            {
                start_idx: start_idx,
                end_idx: end_idx
            },
            function (data) {
                self.vue.has_more_records = data.has_more_records;
                self.extend(self.vue.records, data.recordlist);
            });
    };

    self.delete_task = function (task_id) {
        if (self.vue.is_counting_down) { // you can't delete a task while counting down
            $.post(del_conflict_url, function () {
            });
            return;
        }
        if (self.vue.logged_in) {
            $.post(del_task_url, {task_id: task_id}, function () {
                self.get_tasks()
            });
        }
        var idx = null; var del_name;
        for (var i = 0; i < self.vue.tasks.length; i++) {
            if (self.vue.tasks[i].id === task_id) {
                // If I set this to i, it won't work, as the if below will
                // return false for items in first position.
                idx = i + 1;
                del_name = self.vue.tasks[i].name;
                break;
            }
        }
        if (idx) {
            self.vue.tasks.splice(idx - 1, 1);
            var old_records = self.vue.records;
            self.vue.records = [];
            for (var j = old_records.length - 1; j >= 0; j--){
                if (old_records[j].task != del_name)
                    self.vue.records.unshift(old_records[j])
            }
            if (self.vue.selected_task_id == task_id) {
                self.vue.selected_task_id = null;
                self.vue.time_actual = 25 * 60;
                self.vue.time_countdown = '00:25:00';
            }
        }
        // toggle graph
        //if (self.vue.show_graph)
        //    self.vue.show_graph = false;
        self.update_graph();
    };


    self.delete_all_records = function () {
        if (self.vue.logged_in) {
            $.post(del_records_url, function () {
            })
        }
        self.vue.records = []
    };


    function paddingZero(i) {
        return (i < 10) ? ('0' + i) : i;
    }


    self.start_count_down = function () {
        if (self.vue.time_actual === 0)
            return;

        // check if selected task exists
        var has_task = false;
        for (var i = 0; i < self.vue.tasks.length; ++i) {
            if (self.vue.selected_task_id == self.vue.tasks[i].id) {
                has_task = true
            }
        } // if not, show tips "Please select a task to start!"
        if (!has_task) {
            $.post(no_task_to_start_url, function () {});
            self.vue.selected_task_id = null;
            self.vue.time_actual = 25 * 60;
            self.vue.time_countdown = '00:25:00';
            return;
        }
        self.vue.is_counting_down = true;
        self.vue.myClock = setInterval(
            function () {
                --self.vue.time_actual;
                var hr = paddingZero(Math.floor(self.vue.time_actual / 3600));
                var min = paddingZero(Math.floor(self.vue.time_actual % 3600 / 60));
                var sec = paddingZero(self.vue.time_actual % 60);
                self.vue.time_countdown = hr + ':' + min + ":" + sec;
                if (self.vue.time_actual === 0) {
                    clearInterval(self.vue.myClock);
                    self.time_up_twinkle();
                }
            }, 1000);
    };


    self.time_up_twinkle = function () {
        self.vue.alarm.play();
        self.vue.myTwinkle = setInterval(
            function () {
                self.vue.is_twinkling = !self.vue.is_twinkling;
            }, 500)
    };


    function time_format(t) {
        if (t == 1) return '1 second';
        if (t < 60) return t + ' seconds';
        var hr = Math.floor(t / 3600);
        var min = Math.floor(t % 3600 / 60);
        var result = "";
        if (hr > 0) {
            result += hr;
            if (hr > 1)
                result += ' hours ';
            else result += ' hour ';
        }
        if (min > 0) {
            result += min;
            if (min > 1)
                result += ' minutes ';
            else result += ' minute ';
        }
        return result
    }


    self.stop_count_down = function () {
        clearInterval(self.vue.myClock);
        clearInterval(self.vue.myTwinkle);
        self.vue.is_counting_down = false;
        self.vue.is_twinkling = false;
        self.vue.alarm.pause();
        if (self.vue.selected_task_id == null) return;
        var task_name, time_used;
        for (var i = 0; i < self.vue.tasks.length; i++) {
            if (self.vue.tasks[i].id === self.vue.selected_task_id) {
                time_used = self.vue.tasks[i].time - self.vue.time_actual;
                self.vue.tasks[i].time = self.vue.time_actual;
                task_name = self.vue.tasks[i].name;
                break;
            }
        }
        if (time_used == 0) return;
        var time_used_str = time_format(time_used);
        self.vue.records.unshift({task: task_name, time_used: time_used_str, record_type: 'plain'});
        if (self.vue.logged_in) {
            $.post(update_time_url,
                {
                    time_remained: self.vue.time_actual,
                    task_id: self.vue.selected_task_id
                },
                function () {
                    self.update_graph();
                });
            $.post(add_record_url, {task: task_name, time_used: time_used_str, record_type: 'plain'}, function () {
                self.get_records();
            });
        }

    };


    self.plus_time = function (t) {
        clearInterval(self.vue.myTwinkle);
        self.vue.is_twinkling = false;
        self.vue.alarm.pause();

        // check if selected task exists
        var has_task = false;
        for (var a = 0; a < self.vue.tasks.length; ++a) {
            if (self.vue.selected_task_id == self.vue.tasks[a].id) {
                has_task = true
            }
        } // if not, show tips "Please select a task to start!"
        if (!has_task) {
            $.post(no_task_to_start_url, function () {});
            self.vue.selected_task_id = null;
            self.vue.time_actual = 25 * 60;
            self.vue.time_countdown = '00:25:00';
            return;
        }

        // add requested time
        self.vue.time_actual = t * 60;
        var hr = paddingZero(Math.floor(t / 60));
        var min = paddingZero(Math.floor(t % 60));
        self.vue.time_countdown = hr + ':' + min + ":00";
        var task_name, time_used;
        for (var i = 0; i < self.vue.tasks.length; i++) {
            if (self.vue.tasks[i].id === self.vue.selected_task_id) {
                time_used = self.vue.tasks[i].time;
                self.vue.tasks[i].time = t * 60;
                task_name = self.vue.tasks[i].name;
                break;
            }
        }
        if (time_used != 0){
            var time_used_str = time_format(time_used);
            self.vue.records.unshift({task: task_name, time_used: time_used_str, record_type: 'plain'});
        }
        var time_request_str = time_format(t * 60);
        self.vue.records.unshift({task: task_name, time_used: time_request_str, record_type: 'request'});
        if (self.vue.logged_in) {
            $.post(update_time_url,
                {
                    time_remained: self.vue.time_actual,
                    time_total: 'update',
                    task_id: self.vue.selected_task_id
                },
                function () {
                });
            $.post(add_record_url, {task: task_name, time_used: time_request_str, record_type: 'request'}, function () {
                if (time_used != 0)
                $.post(add_record_url, {task: task_name, time_used: time_used_str, record_type: 'plain'}, function () {
                    self.get_records();
                    self.update_graph();
                });
            });
        }

        // start counting down
        self.vue.is_counting_down = true;
        self.vue.myClock = setInterval(
            function () {
                --self.vue.time_actual;
                var hr = paddingZero(Math.floor(self.vue.time_actual / 3600));
                var min = paddingZero(Math.floor(self.vue.time_actual % 3600 / 60));
                var sec = paddingZero(self.vue.time_actual % 60);
                self.vue.time_countdown = hr + ':' + min + ":" + sec;
                if (self.vue.time_actual === 0) {
                    clearInterval(self.vue.myClock);
                    self.time_up_twinkle();
                }
            }, 1000);
    };


    self.select_task = function (task) {
        // you can't select a task while other task is counting down
        if (!self.vue.is_counting_down) {
            // unselect
            if (self.vue.selected_task_id == task.id) {
                self.vue.selected_task_id = null;
                self.vue.time_actual = 25 * 60;
                self.vue.time_countdown = '00:25:00';
            }
            else { // select
                self.vue.selected_task_id = task.id;
                // in seconds
                self.vue.time_actual = task.time;
                // hr:min:sec
                self.vue.time_countdown = paddingZero(Math.floor(task.time / 3600))
                    + ':' + paddingZero(Math.floor((task.time % 3600) / 60))
                    + ':' + paddingZero(task.time % 3600 % 60);
            }
        }
    };


    self.get_graph = function () {
        if (self.vue.records.length == 0) {
            $.post(no_record_url, function () {
            });
            return
        }

        $.post(check_graph_all_tasks_url, function (data) {
            self.vue.has_graph_all_tasks = data.has_graph_all_tasks
        });
        $.post(get_graph_all_tasks_url, function () {
        });

        $.post(check_graph_productive_url, function (data) {
            self.vue.has_graph_productive = data.has_graph_productive
        });
        $.post(get_graph_productive_url, function () {
        });

        $.post(check_graph_versus_url, function (data) {
            self.vue.has_graph_versus = data.has_graph_versus

        });
        $.post(get_graph_versus_url, function () {
        });
        self.vue.show_graph = true;
    };


    self.initialize_graph = function () {
        $.post(get_graph_all_tasks_url, function () {
        });
        $.post(get_graph_productive_url, function () {
        });
        $.post(get_graph_versus_url, function () {
        });
    };


    self.update_graph = function() {
        if (self.vue.graph_page==1)
            self.get_chart_data();
        else if (self.vue.graph_page==2)
            self.get_chart_data2();
        else if (self.vue.graph_page==3)
            self.get_chart_data3();
    };


    /*****************The following codes were written by Qin Jingfei************************************************/
    self.get_chart_data = function () {

        self.vue.graph_page=1;

        var background_color1 = document.getElementById("buttom1");
        // check if it's null, if yes, terminate
        // it's null when not logged in, see index.html
        if (!background_color1)
            return;
        background_color1.style.background = "#DCDCDC";

        var background_color2 = document.getElementById("buttom2");
        background_color2.style.background = "#FFFFFF";

        // var background_color3 = document.getElementById("buttom3");
        // background_color3.style.background = "#FFFFFF";

        var whole_graph1 = document.getElementById("whole_graph1");
        whole_graph1.style.display = "block";

        var myChart4 = document.getElementById("myChart4");
        myChart4.style.display = "none";

        var text1 = document.getElementById("text1");
        text1.style.display = "block";

        var whole_graph2 = document.getElementById("whole_graph2");
        whole_graph2.style.display = "none";


        var start_idx = 0;
        var end_idx = 4;

        // get data from server
        $.getJSON(get_pie_graph_versus_data_url,
            {
                start_idx: start_idx,
                end_idx: end_idx
            },
            function (data) {
                self.vue.label1 = data.labels;
                self.vue.time1 = data.data;
                // create a chart
                var ctx = document.getElementById("myChart1");
                var myChart = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: self.vue.label1,
                        datasets: [{
                            label: 'Total Time',
                            data: self.vue.time1,
                            backgroundColor: [
                                'rgba(0,255,0,0.2)',
                                'rgba(0, 0, 255, 0.2)',
                                'rgba(255, 0, 0, 0.2)',
                                'rgba(75, 192, 192, 0.2)',
                                'rgba(153, 102, 255, 0.2)',
                                'rgba(255, 159, 64, 0.2)'
                            ],
                            hoverBackgroundColor: [
                                'rgba(0,255,0,0.2)',
                                'rgba(0, 0, 255, 0.2)',
                                'rgba(255, 0, 0, 0.2)',
                                'rgba(75, 192, 192, 0.2)',
                                'rgba(153, 102, 255, 0.2)',
                                'rgba(255, 159, 64, 0.2)'
                            ]
                        }]
                    }
                });

            });

        $.getJSON(get_pie_graph_all_task_data_url,
            {
                start_idx: start_idx,
                end_idx: end_idx
            },
            function (data) {
                self.vue.label2 = data.labels;
                self.vue.time2 = data.data;
                // create a chart
                var ctx = document.getElementById("myChart2");
                var myChart = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: self.vue.label2,
                        datasets: [{
                            label: 'Total Time',
                            data: self.vue.time2,
                            backgroundColor: [
                                'rgba(75, 192, 192, 1)',
                                'rgba(153, 102, 255, 1)',
                                'rgba(255, 159, 64, 1)',
                                'rgba(255,99,132,1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 206, 86, 1)'

                            ],
                            hoverBackgroundColor: [
                                'rgba(75, 192, 192, 1)',
                                'rgba(153, 102, 255, 1)',
                                'rgba(255, 159, 64, 1)',
                                'rgba(255,99,132,1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 206, 86, 1)'
                            ]

                        }]
                    }
                });

            });
        $.getJSON(get_pie_graph_productive_data_url,
            {
                start_idx: start_idx,
                end_idx: end_idx
            },
            function (data) {
                self.vue.label3 = data.labels;
                self.vue.time3 = data.data;
                // create a chart
                var ctx = document.getElementById("myChart3");
                var myChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: self.vue.label3,
                        datasets: [{
                            label: 'Total Time',
                            data: self.vue.time3,
                            backgroundColor: [
                                '#0099CC',
                                '#CCCCCC',
                                '#FF6666',
                                'rgba(255, 99, 132, 0.2)',
                                'rgba(54, 162, 235, 0.2)',
                                'rgba(255, 206, 86, 0.2)'

                            ],
                            hoverBackgroundColor: [
                                '#0099CC',
                                '#CCCCCC',
                                '#FF6666',
                                'rgba(255,99,132,1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 206, 86, 1)'
                            ]
                        }]
                    }
                });

            });
    };


    self.get_chart_data2 = function () {
        self.vue.graph_page=2;

        var background_color1 = document.getElementById("buttom1");
        background_color1.style.background = "#FFFFFF";

        var background_color2 = document.getElementById("buttom2");
        background_color2.style.background = "#DCDCDC";

        // var background_color3 = document.getElementById("buttom3");
        // background_color3.style.background = "#FFFFFF";

        var whole_graph1 = document.getElementById("whole_graph1");
        whole_graph1.style.display = "none";

        var myChart4 = document.getElementById("myChart4");
        myChart4.style.display = "block";

        var text1 = document.getElementById("text1");
        text1.style.display = "none";

        var whole_graph2 = document.getElementById("whole_graph2");
        whole_graph2.style.display = "none";

        var start_idx = 0;
        var end_idx = 4;
        $.getJSON(get_bar_data_url,
            {
                start_idx: start_idx,
                end_idx: end_idx
            },
            function (data) {
                self.vue.label4 = data.labels;
                self.vue.time4 = data.data;

                // create a chart
                var ctx = document.getElementById("myChart4");
                var myChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: self.vue.label4,
                        datasets: [{
                            label: '# of Tasks',
                            data: self.vue.time4,
                            backgroundColor: [
                                'rgba(255, 159, 64, 0.2)',
                                'rgba(255, 99, 132, 0.2)',
                                'rgba(54, 162, 235, 0.2)',
                                'rgba(255, 206, 86, 0.2)',
                                'rgba(75, 192, 192, 0.2)',
                                'rgba(153, 102, 255, 0.2)'
                            ],
                            borderColor: [
                                'rgba(255, 159, 64, 1)',
                                'rgba(255,99,132,1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 206, 86, 1)',
                                'rgba(75, 192, 192, 1)',
                                'rgba(153, 102, 255, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: {
                            yAxes: [{
                                ticks: {
                                    beginAtZero: true
                                }
                            }]
                        }
                    }
                });

            });
    };

    self.get_chart_data3 = function () {
        self.vue.graph_page=3;
        var background_color1 = document.getElementById("buttom1");
        background_color1.style.background = "#FFFFFF";
        var background_color2 = document.getElementById("buttom2");
        background_color2.style.background = "#FFFFFF";
        var background_color3 = document.getElementById("buttom3");
        background_color3.style.background = "#DCDCDC";
        var whole_graph1 = document.getElementById("whole_graph1");
        whole_graph1.style.display = "none";
        var myChart4 = document.getElementById("myChart4");
        myChart4.style.display = "none";
        var text1 = document.getElementById("text1");
        text1.style.display = "none";




    };
    /*****************The codes above were written by Qin Jingfei************************************************/

    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            idx: 0, // used for task id if not logged in
            tasks: [], // local tasklist
            records: [], // local records
            selected_task_id: null, // keep track of which task is selected

            // input fields in the upper right panel
            // serve as v-model in index.html
            form_task: null,
            form_time: 25,
            form_category: 'p',

            // output fields in the left panel
            time_countdown: '00:25:00', // to show the time with time format
            time_actual: 25 * 60, // actual time in seconds

            // console information
            logged_in: false,
            has_more_tasks: false,
            is_adding_task: true,
            is_counting_down: false,
            myClock: null, // clock object doing the countdown
            myTwinkle: null, // used for twinkle 00:00:00 when time's up
            is_twinkling: false, // used for twinkle 00:00:00 when time's up
            alarm: new Audio(alarm_url), // alarm played when time's up

            // mathlabplot graphing, no longer used since we switched to chart.js
            show_graph: false, // initially don't show the graph
            has_graph_all_tasks: false,
            has_graph_productive: false,
            has_graph_versus: false,
            graph_page: null,

            //define chart variables  added by Qin Jingfei
            time1: [],
            label1: [],

            time2: [],
            label2: [],

            time3: [],
            label3: [],

            time4: [],
            label4: []
        },
        methods: {
            // functions that used in index.html, defined above
            add_task: self.add_task,
            get_tasks: self.get_tasks,
            get_records: self.get_records,
            get_more_tasks: self.get_more_tasks,
            get_more_records: self.get_more_records,
            delete_task: self.delete_task,
            delete_all_records: self.delete_all_records, // unused, I don't want the user to delete his/her record
            select_task: self.select_task, // if user click on one task, select it
            task_exists: self.task_exists, // take a given task as argument and check if it exists
            extend: self.extend, // used by get more functions, extend an array

            // for countdown clock
            start_count_down: self.start_count_down,
            stop_count_down: self.stop_count_down,
            // time's up!
            time_up_twinkle: self.time_up_twinkle,
            // request more time
            plus_time: self.plus_time,

            // mathlabplot graphing, no longer used since we switched to chart.js
            get_graph: self.get_graph,
            initialize_graph: self.initialize_graph,
            update_graph: self.update_graph,

            //get and draw chart for chart.js     Added by Qin Jingfei
            get_chart_data: self.get_chart_data,
            get_chart_data2: self.get_chart_data2,
            get_chart_data3: self.get_chart_data3
        },
        computed: {
            // no longer used
            // we can't do &&, ||, or other logic operator in v-if
            // so vue.js provide a computed section
            not_show_graph_and_logged_in: function () {
                return !this.show_graph && this.logged_in
            },
            no_graph_can_be_showed: function () {
                return this.show_graph && !this.has_graph_all_tasks && !this.has_graph_productive && !this.has_graph_versus
            }
        }

    });
    self.get_tasks(); // so that user can see his/her tasks when open/refresh the page
    self.get_records(); // so that user can see his/her records when open/refresh the page
    // self.initialize_graph(); // we switch from mathlab plot to chart.js, no longer useful
    self.get_chart_data();
    $("#vue-div").show();
    return self;
};


var APP = null;

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function () {
    APP = app();
});
