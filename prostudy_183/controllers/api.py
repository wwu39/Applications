# Create by Weikai Wu

from datetime import timedelta


def get_user_name_from_email(email):
    """Returns a string corresponding to the user first and last names,
    given the user email."""
    u = db(db.auth_user.email == email).select().first()
    if u is None:
        return 'None'
    else:
        return ' '.join([u.first_name, u.last_name])


@auth.requires_signature()
def add_task():
    # request.vars is the object sent from local server (default_index.js)
    name = request.vars.task_content
    cate = request.vars.task_category
    time = int(request.vars.task_time) * 60  # time is in seconds

    if auth.user_id:  # if logged in
        # add to database
        t_id = db.task.insert(
            task_content=name,
            category=cate,
            time_remained=time,
            time_total=time
        )
        # has to return a dictionary
        # so that you can call data.id, data.name, data.cate, and data.time in local server (default_index.js)
        return response.json(dict(id=t_id, name=name, cate=cate, time=time))
    return 'failed'


@auth.requires_signature()
def add_record():
    db.record.insert(task=request.vars.task,
                     time_used=request.vars.time_used,
                     record_type=request.vars.record_type)
    return 'ok'


def get_tasks():
    logged_in = True
    has_more_tasks = False
    tasklist = []
    current_usr_email = auth.user.email if auth.user_id else None
    if auth.user_id:
        start_idx = int(request.vars.start_idx) if request.vars.start_idx is not None else 0
        end_idx = int(request.vars.end_idx) if request.vars.end_idx is not None else 0
        rows = db(db.task.user_email == auth.user.email).select(db.task.ALL, orderby=~db.task.created_on,
                                                                limitby=(start_idx, end_idx + 1))
        for i, r in enumerate(rows):
            if i < end_idx - start_idx:
                if auth.user.email == r.user_email:
                    t = dict(
                        id=r.id,
                        name=r.task_content,
                        cate=r.category,
                        time=r.time_remained,
                        time_t=r.time_total

                    )
                    tasklist.append(t)
            else:
                has_more_tasks = True
                break
    else:
        logged_in = False
    return response.json(dict(
        logged_in=logged_in,
        has_more_tasks=has_more_tasks,
        tasklist=tasklist,
        current_usr_email=current_usr_email
    ))


def get_records():
    logged_in = True
    has_more_records = False
    recordlist = []
    current_usr_email = auth.user.email if auth.user_id else None
    if auth.user_id:
        start_idx = int(request.vars.start_idx) if request.vars.start_idx is not None else 0
        end_idx = int(request.vars.end_idx) if request.vars.end_idx is not None else 0
        rows = db(db.record.user_email == auth.user.email).select(db.record.ALL,
                                                                  orderby=~db.record.created_on | ~db.record.record_type,
                                                                  limitby=(start_idx, end_idx + 1))
        for i, r in enumerate(rows):
            if i < end_idx - start_idx:
                if auth.user.email == r.user_email:
                    t = dict(task=r.task,
                             time_used=r.time_used,
                             record_type=r.record_type)
                    recordlist.append(t)
            else:
                has_more_records = True
                break
    else:
        logged_in = False
    return response.json(dict(
        logged_in=logged_in,
        has_more_records=has_more_records,
        recordlist=recordlist,
        current_usr_email=current_usr_email
    ))


@auth.requires_signature()
def del_task():
    if auth.user_id:
        del_name = db.task[request.vars.task_id].task_content
        db(db.task.id == request.vars.task_id).delete() # delete the task
        db(db.record.task == del_name).delete() # delete all associate records
        return 'ok'
    return 'failure'


@auth.requires_signature()
def del_all_records():
    db(db.record.user_email == auth.user.email).delete()
    return 'ok'


@auth.requires_signature()
def update_time():
    time = int(request.vars.time_remained)
    db(db.task.id == request.vars.task_id).update(time_remained=time)
    if request.vars.time_total:
        time_total = db.task[request.vars.task_id].time_total
        time_total += time
        db(db.task.id == request.vars.task_id).update(time_total=time_total)
    return 'ok'

# mathlab plot functions by Weikai Wu
# no longer used


def get_pie_graph_all_task():
    if not auth.user_id:
        return plot_pie('', [], [], [])
    # do not select tasks that have not yet started
    rows = db((db.task.user_email == auth.user.email)
              & (db.task.time_total != db.task.time_remained)).select(db.task.ALL, orderby=~db.task.created_on)
    time_used_list = []
    explode = []
    labels = []
    for r in rows:
        time_used_list.append(float(r.time_total - r.time_remained))
        labels.append(r.task_content)
        if r.category == 'p':
            explode.append(0.1)
        else:
            explode.append(0.0)
    total_time_used = sum(time_used_list)
    percentiles = [t / total_time_used for t in time_used_list]
    response.headers['Content-Type'] = 'image/png'
    return plot_pie('All Tasks', percentiles, explode, labels)


def get_pie_graph_all_task_data():
    time_used_list = []
    explode = []
    labels = []
    if not auth.user_id:
        return response.json(dict(data=[], labels=[]))
    # do not select tasks that have not yet started
    rows = db((db.task.user_email == auth.user.email)
              & (db.task.time_total != db.task.time_remained)).select(db.task.ALL, orderby=~db.task.created_on)

    for r in rows:
        time_used_list.append(float(r.time_total - r.time_remained))
        labels.append(r.task_content)
        if r.category == 'p':
            explode.append(0.1)
        else:
            explode.append(0.0)
    total_time_used = sum(time_used_list)
    percentiles = [t / total_time_used for t in time_used_list]
    return response.json(dict(data=percentiles, labels=labels))


###################################The following codes were written by Qin Jingfei###########################################
def get_pie_graph_productive_data():
    time_used_list = []
    labels = []
    if not auth.user_id:
        return response.json(dict(data=[], labels=[], colors=[]))
    # select all the productive task of the current user
    # do not select tasks that have not yet started
    rows = db((db.task.user_email == auth.user.email)
              & (db.task.time_total != db.task.time_remained)
              & (db.task.category == 'p')).select(db.task.ALL, orderby=~db.task.created_on)
    for r in rows:
        time_used_list.append(float(r.time_total - r.time_remained))
        labels.append(r.task_content)
    total_time_used = sum(time_used_list)
    percentiles = [t / total_time_used for t in time_used_list]
    # largest sector spread out a bit
    explode = [0.0] * len(labels)
    if len(time_used_list) != 0:
        explode[time_used_list.index(max(time_used_list))] = 0.1
    return response.json(dict(data=percentiles, labels=labels))


def get_pie_graph_versus_data():
    percentiles = []
    labels = []
    colors = []

    if not auth.user_id:
        return response.json(dict(data=[], labels=[], colors=[]))

    rows = db(db.task.user_email == auth.user.email).select(db.task.ALL, orderby=~db.task.created_on)
    p_total_times, np_total_times, n_total_times = 0.0, 0.0, 0.0
    for r in rows:
        time_used = float(r.time_total - r.time_remained)
        if r.category is 'p':
            p_total_times += time_used
        elif r.category == 'np':
            np_total_times += time_used
        elif r.category is 'n':
            n_total_times += time_used

    if p_total_times != 0.0:
        percentiles.append(p_total_times)
        labels.append('Productive')
        colors.append('lightgreen')
    if np_total_times != 0.0:
        percentiles.append(np_total_times)
        labels.append('Non-Prod')
        colors.append('skyblue')
    if n_total_times != 0.0:
        percentiles.append(n_total_times)
        labels.append('Necessary')
        colors.append('firebrick')

    return response.json(dict(data=percentiles, labels=labels, colors=colors))


def get_bar_data():
    data = [0] * 7
    labels = []

    if not auth.user_id:
        return response.json(dict(data=[], labels=[]))
    rows = db(db.task.user_email == auth.user.email).select(db.task.ALL, orderby=~db.task.updated_on)
    # today's time
    a = datetime.datetime.utcnow()
    labels.append((a - timedelta(days=6)).strftime("%m/%d"))
    labels.append((a - timedelta(days=5)).strftime("%m/%d"))
    labels.append((a - timedelta(days=4)).strftime("%m/%d"))
    labels.append((a - timedelta(days=3)).strftime("%m/%d"))
    labels.append((a - timedelta(days=2)).strftime("%m/%d"))
    labels.append((a - timedelta(days=1)).strftime("%m/%d"))
    labels.append(a.strftime("%m/%d"))

    for r in rows:
        if datetime.datetime.strftime(r.updated_on, '%m/%d') == a.strftime("%m/%d"):
            if r.time_total - r.time_remained:
                data[6] += 1
        elif datetime.datetime.strftime(r.updated_on, '%m/%d') == (a-timedelta(days=1)).strftime("%m/%d"):
            if r.time_total - r.time_remained:
                data[5] += 1
        elif datetime.datetime.strftime(r.updated_on, '%m/%d') == (a-timedelta(days=2)).strftime("%m/%d"):
            if r.time_total - r.time_remained:
                data[4] += 1
        elif datetime.datetime.strftime(r.updated_on, '%m/%d') == (a-timedelta(days=3)).strftime("%m/%d"):
            if r.time_total - r.time_remained:
                data[3] += 1
        elif datetime.datetime.strftime(r.updated_on, '%m/%d') == (a-timedelta(days=4)).strftime("%m/%d"):
            if r.time_total - r.time_remained:
                data[2] += 1
        elif datetime.datetime.strftime(r.updated_on, '%m/%d') == (a-timedelta(days=5)).strftime("%m/%d"):
            if r.time_total - r.time_remained:
                data[1] += 1
        elif datetime.datetime.strftime(r.updated_on, '%m/%d') == (a-timedelta(days=6)).strftime("%m/%d"):
            if r.time_total - r.time_remained:
                data[0] += 1

    return response.json(dict(data=data, labels=labels))


###################################The codes above were written by Qin Jingfei###########################################

# the following is no longer used - Weikai Wu


def get_pie_graph_productive():
    if not auth.user_id:
        return plot_pie('', [], [], [])
    # select all the productive task of the current user
    # do not select tasks that have not yet started
    rows = db((db.task.user_email == auth.user.email)
              & (db.task.time_total != db.task.time_remained)
              & (db.task.category == 'p')).select(db.task.ALL, orderby=~db.task.created_on)
    time_used_list = []
    labels = []
    for r in rows:
        time_used_list.append(float(r.time_total - r.time_remained))
        labels.append(r.task_content)
    total_time_used = sum(time_used_list)
    percentiles = [t / total_time_used for t in time_used_list]
    # largest sector spread out a bit
    explode = [0.0] * len(labels)
    if len(time_used_list) != 0:
        explode[time_used_list.index(max(time_used_list))] = 0.1
    response.headers['Content-Type'] = 'image/png'
    return plot_pie('Productive Tasks Only', percentiles, explode, labels)


def get_pie_graph_versus():
    if not auth.user_id:
        return plot_pie('', [], [], [])
    rows = db(db.task.user_email == auth.user.email).select(db.task.ALL, orderby=~db.task.created_on)
    p_total_times, np_total_times, n_total_times = 0.0, 0.0, 0.0
    for r in rows:
        time_used = float(r.time_total - r.time_remained)
        if r.category is 'p':
            p_total_times += time_used
        elif r.category == 'np':
            np_total_times += time_used
        elif r.category is 'n':
            n_total_times += time_used
    percentiles = []
    labels = []
    explode = []
    colors = []
    total_times = p_total_times + np_total_times + n_total_times
    if p_total_times != 0.0:
        percentiles.append(p_total_times / total_times)
        labels.append('Productive')
        explode.append(0.1)
        colors.append('lightgreen')
    if np_total_times != 0.0:
        percentiles.append(np_total_times / total_times)
        labels.append('Non-Prod')
        explode.append(0.0)
        colors.append('skyblue')
    if n_total_times != 0.0:
        percentiles.append(n_total_times / total_times)
        labels.append('Necessary')
        explode.append(0.0)
        colors.append('firebrick')
    response.headers['Content-Type'] = 'image/png'
    return plot_pie('Category Sectors', percentiles, explode, labels, colors)


# check if it's none graph
# we can't tell the graph returned by get_graph functions is what


def check_graph_all_task():
    rows = db((db.task.user_email == auth.user.email)
              & (db.task.time_total != db.task.time_remained)).select(db.task.ALL, orderby=~db.task.created_on)
    has_graph_all_tasks = True
    if len(rows) is 0:
        has_graph_all_tasks = False
    return response.json(dict(has_graph_all_tasks=has_graph_all_tasks))


def check_graph_productive():
    rows = db((db.task.user_email == auth.user.email)
              & (db.task.time_total != db.task.time_remained)
              & (db.task.category == 'p')).select(db.task.ALL, orderby=~db.task.created_on)
    has_graph_productive = True
    if len(rows) is 0:
        has_graph_productive = False
    return response.json(dict(has_graph_productive=has_graph_productive))


def check_graph_versus():
    rows = db(db.task.user_email == auth.user.email).select(db.task.ALL, orderby=~db.task.created_on)
    has_graph_versus = True
    if len(rows) is 0:
        has_graph_versus = False
    return response.json(dict(has_graph_versus=has_graph_versus))

# Create by Weikai Wu
