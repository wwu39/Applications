# -*- coding: utf-8 -*-
# this file is released under public domain and you can use without limitations

# -------------------------------------------------------------------------
# This is a sample controller
# - index is the default action of any application
# - user is required for authentication and authorization
# - download is for downloading files uploaded in the db (does streaming)
# -------------------------------------------------------------------------

import time
from datetime import timedelta

d3 = 0


def index():
    """
    example action using the internationalization operator T and flash
    rendered by views/default/index.html or views/generic.html

    if you need a simple wiki simply replace the two lines below with:
    return auth.wiki()
    """
    # response.flash = T("Welcome")
    # Welcome is annoying
    return dict()


# the following is written by Weikai Wu

def empty_form():
    response.flash = T("Please enter a task!")
    return 'empty form'


def dup_task():
    response.flash = T("Task exist!")
    return 'duplicate task'


def no_record():
    response.flash = T("No Record!")
    return 'no record'


def add_conflict():
    response.flash = T("Can't add task while counting down")
    return 'councting down'


def del_conflict():
    response.flash = T("Can't delete task while counting down")
    return 'councting down'


def no_task_to_start():
    response.flash = T("Please select a task to start")
    return 'no task to start'


# the above is written by Weikai Wu


def user():
    """
    exposes:
    http://..../[app]/default/user/login
    http://..../[app]/default/user/logout
    http://..../[app]/default/user/register
    http://..../[app]/default/user/profile
    http://..../[app]/default/user/retrieve_password
    http://..../[app]/default/user/change_password
    http://..../[app]/default/user/bulk_register
    use @auth.requires_login()
        @auth.requires_membership('group name')
        @auth.requires_permission('read','table name',record_id)
    to decorate functions that need access control
    also notice there is http://..../[app]/appadmin/manage/auth to allow administrator to manage users
    """
    return dict(form=auth())


@cache.action()
def download():
    """
    allows downloading of uploaded files
    http://..../[app]/default/download/[filename]
    """
    return response.download(request, db)


def call():
    """
    exposes services. for example:
    http://..../[app]/default/call/jsonrpc
    decorate with @services.jsonrpc the functions to expose
    supports xml, json, xmlrpc, jsonrpc, amfrpc, rss, csv
    """
    return service()


def home():
    return locals()


def BG():
    return dict(message="hello from BG.py")


def help():
    return dict(message="hello")


def set_timezone():
    """Ajax call to set the timezone information for the session."""
    tz_name = request.vars.name
    from pytz import all_timezones_set
    if tz_name in all_timezones_set:
        session.user_timezone = tz_name
