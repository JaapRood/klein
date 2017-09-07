const FS = require('fs-extra');
const { test } = require('ava');
const Helpers = require('./helpers');

const Log = require('../tasks/log');
Log.silent = true;

test('It can create a new migration', t => {
    const Tasks = require('../tasks');
    process.env.APP_ROOT = '/tmp/klein/new-migration';
    FS.removeSync(process.env.APP_ROOT);

    return Tasks.newMigration(['add-name-to-users']).then(files => {
        t.is(files.length, 1);
        t.regex(files[0], /\d+_add-name-to-users\.js/);

        var file_contents = FS.readFileSync(files[0], 'utf8');

        t.true(file_contents.includes('up(knex, Promise) {'));
        t.true(file_contents.includes('down(knex, Promise) {'));

        t.true(file_contents.includes(`return knex.schema.table('users', table => {`));
        t.true(file_contents.includes(`table.string('name');`));
    });
});

test('It can create a new migration with supplied column details', t => {
    const Tasks = require('../tasks');
    process.env.APP_ROOT = '/tmp/klein/new-migration-with-columns';
    FS.removeSync(process.env.APP_ROOT);

    return Tasks.newMigration(['add-age-to-users', 'age:integer']).then(files => {
        t.is(files.length, 1);
        t.regex(files[0], /\d+_add-age-to-users\.js/);

        var file_contents = FS.readFileSync(files[0], 'utf8');

        t.true(file_contents.includes('up(knex, Promise) {'));
        t.true(file_contents.includes('down(knex, Promise) {'));

        t.true(file_contents.includes(`return knex.schema.table('users', table => {`));
        t.true(file_contents.includes(`table.integer('age');`));
    });
});

test('It can create a new model', t => {
    const Tasks = require('../tasks');

    process.env.APP_ROOT = '/tmp/klein/new-model';
    FS.removeSync(process.env.APP_ROOT);

    return Tasks.newModel(['users', 'first_name:string', 'last_name:string', 'credit:integer']).then(files => {
        t.is(files.length, 2);
        t.regex(files[0], /\d+_create-users\.js/);
        t.regex(files[1], /users\.js/);

        var file_contents = FS.readFileSync(files[0], 'utf8');

        t.true(file_contents.includes('up(knex, Promise) {'));
        t.true(file_contents.includes('down(knex, Promise) {'));

        t.true(file_contents.includes(`return knex.schema.createTable('users', table => {`));
        t.true(file_contents.includes(`table.string('first_name');`));
        t.true(file_contents.includes(`table.string('last_name');`));
        t.true(file_contents.includes(`table.integer('credit');`));

        var file_contents = FS.readFileSync(files[1], 'utf8');

        t.true(file_contents.includes(`module.exports = Klein.model('users');`));
    });
});

test('It can create a new model with different timestamp names', t => {
    const Tasks = require('../tasks');

    process.env.APP_ROOT = '/tmp/klein/new-model-with-different-timestamps';
    FS.removeSync(process.env.APP_ROOT);

    return Tasks.newModel(['users', 'name:string'], {
        timestamps: { created_at: 'createdAt', updated_at: 'updatedAt' }
    }).then(files => {
        t.is(files.length, 2);
        t.regex(files[0], /\d+_create-users\.js/);
        t.regex(files[1], /users\.js/);

        var file_contents = FS.readFileSync(files[0], 'utf8');

        t.true(file_contents.includes('up(knex, Promise) {'));
        t.true(file_contents.includes('down(knex, Promise) {'));

        t.true(file_contents.includes(`return knex.schema.createTable('users', table => {`));
        t.true(file_contents.includes(`table.string('name');`));
        t.true(file_contents.includes(`table.timestamp('createdAt');`));
        t.true(file_contents.includes(`table.timestamp('updatedAt');`));
        t.true(file_contents.includes(`table.index('createdAt');`));
        t.true(file_contents.includes(`table.index('updatedAt');`));

        var file_contents = FS.readFileSync(files[1], 'utf8');

        t.true(file_contents.includes(`module.exports = Klein.model('users', {`));
        t.true(file_contents.includes(`timestamps: {`));
        t.true(file_contents.includes(`created_at: 'createdAt'`));
        t.true(file_contents.includes(`updated_at: 'updatedAt'`));
    });
});

test('It can create a new model without timestamps', t => {
    const Tasks = require('../tasks');

    process.env.APP_ROOT = '/tmp/klein/new-model-without-timestamps';
    FS.removeSync(process.env.APP_ROOT);

    return Tasks.newModel(['users', 'name:string'], {
        timestamps: { created_at: false, updated_at: false }
    }).then(files => {
        t.is(files.length, 2);
        t.regex(files[0], /\d+_create-users\.js/);
        t.regex(files[1], /users\.js/);

        var file_contents = FS.readFileSync(files[0], 'utf8');

        t.true(file_contents.includes('up(knex, Promise) {'));
        t.true(file_contents.includes('down(knex, Promise) {'));

        t.true(file_contents.includes(`return knex.schema.createTable('users', table => {`));
        t.true(file_contents.includes(`table.string('name');`));
        t.false(file_contents.includes(`table.timestamp('createdAt');`));
        t.false(file_contents.includes(`table.timestamp('updatedAt');`));
        t.false(file_contents.includes(`table.index('createdAt');`));
        t.false(file_contents.includes(`table.index('updatedAt');`));

        var file_contents = FS.readFileSync(files[1], 'utf8');

        t.true(file_contents.includes(`module.exports = Klein.model('users', {`));
        t.true(file_contents.includes(`timestamps: false`));
        t.false(file_contents.includes(`created_at: 'createdAt'`));
        t.false(file_contents.includes(`updated_at: 'updatedAt'`));
    });
});

test('It can migrate and roll back', t => {
    const Tasks = require('../tasks');

    process.env.APP_ROOT = '/tmp/klein/migrate-and-rollback';
    FS.removeSync(process.env.APP_ROOT);

    return Helpers.emptyDatabase()
        .then(() => {
            return Tasks.newModel(['users']);
        })
        .then(() => {
            return Tasks.migrate();
        })
        .then(files => {
            t.is(files.length, 1);
            return Tasks.newMigration(['add-name-to-users']);
        })
        .then(() => {
            return Tasks.migrate();
        })
        .then(files => {
            t.is(files.length, 1);
            t.regex(files[0], /\d+_add-name-to-users\.js/);

            return Tasks.rollback();
        })
        .then(files => {
            t.is(files.length, 1);
            t.regex(files[0], /\d+_add-name-to-users\.js/);
        });
});

test.serial('It can get the current schema version', t => {
    const Tasks = require('../tasks');

    process.env.APP_ROOT = '/tmp/klein/schema-version';
    FS.removeSync(process.env.APP_ROOT);

    return Helpers.emptyDatabase()
        .then(() => {
            return Tasks.newModel(['users']);
        })
        .then(() => {
            return Tasks.migrate();
        })
        .then(files => {
            return Tasks.version().then(version => {
                t.is(version, files[0].match(/\d{14}/)[0]);
            });
        });
});

test.serial('It can get the schema for a table', t => {
    const Tasks = require('../tasks');

    process.env.APP_ROOT = '/tmp/klein/table-schema';
    FS.removeSync(process.env.APP_ROOT);

    return Helpers.emptyDatabase()
        .then(() => {
            return Tasks.newModel(['users', 'first_name:string', 'last_name:string', 'credit:integer']);
        })
        .then(() => {
            return Tasks.migrate();
        })
        .then(() => {
            return Tasks.schema().then(schema => {
                t.true(schema instanceof Array);

                let users_table = schema[0];

                t.is(users_table.table, 'users');
                t.is(users_table.columns[1].name, 'first_name');
                t.is(users_table.columns[1].type, 'character varying');

                t.is(users_table.columns[2].name, 'last_name');
                t.is(users_table.columns[2].type, 'character varying');

                t.is(users_table.columns[3].name, 'credit');
                t.is(users_table.columns[3].type, 'integer');

                t.is(users_table.columns[4].name, 'created_at');
                t.is(users_table.columns[4].type, 'timestamp with time zone');

                t.is(users_table.columns[5].name, 'updated_at');
                t.is(users_table.columns[5].type, 'timestamp with time zone');
            });
        });
});
