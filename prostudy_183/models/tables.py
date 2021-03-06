# data table

import datetime

db.define_table('task',
                Field('user_email', default=auth.user.email if auth.user_id else None),
                Field('task_content', 'string'),
                Field('category', 'string'),
                Field('created_on', 'datetime', default=datetime.datetime.utcnow()),
                Field('updated_on', 'datetime', update=datetime.datetime.utcnow()),
                Field('time_remained', 'integer'),
                Field('time_total', 'integer')
                )

db.define_table('record',
                Field('user_email', default=auth.user.email if auth.user_id else None),
                Field('task', 'string'),
                Field('time_used', 'string'),
                Field('record_type', 'string'),
                Field('created_on', 'datetime', default=datetime.datetime.utcnow())
                )

# Create by Weikai Wu

# forum table



db.define_table('post',
                Field('user_email', default=auth.user.email if auth.user_id else None, readable=False, writable=False),
                Field('title', 'string', requires=IS_NOT_EMPTY()),
                Field('body', 'text', requires=IS_NOT_EMPTY()),
                Field('votes', 'integer', default=0, readable=False, writable=False),
                auth.signature
                )

db.define_table('comm',
                Field('post', 'reference post', readable=False, writable=False),
                Field('body', 'text', requires=IS_NOT_EMPTY(), length=1000, notnull=True,
                      represent=lambda text, row: XML(text.replace('\n', '<br />'),
                                                      sanitize=True, permitted_tags=['br/'])),
                auth.signature
                )
# Created by Daniel F Martinez
