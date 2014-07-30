/*

Uses the Google Sheets API to pull data from Sheets and load it onto shared
state. Writes the data out to JSON for later reference. Does not currently
check for existing data to merge--it does a fresh pull every time.

Sheets must be both A) shared publicly and B) "published to web" before they
can be accessed by this task.

*/

var project = require("../project.json");
var async = require("async");
var sheets = require("google-spreadsheets");

var camelCase = function(str) {
  return str.replace(/[^\w]+(\w)/g, function(all, match) {
    return match.toUpperCase();
  });
}

module.exports = function(grunt) {

  grunt.registerTask("sheets", "Downloads from Google Sheets -> JSON", function() {

    var sheetKeys = project.sheets;

    if (!sheetKeys) {
      return grunt.fail.fatal("You must specify a spreadsheet key in project.json!");
    }

    var done = this.async();

    async.each(sheetKeys, function(key, bookDone) {
      sheets({
        key: key,
        worksheet: 1
      }, function(err, book) {
        if (err) {
          grunt.fail.warn("Unable to access book for " + key);
          return bookDone();
        }
        //download each worksheet
        async.each(book.worksheets, function(page, pageDone) {
          page.rows({}, function(err, rows) {
            if (err) {
              grunt.fail.warn("Couldn't load sheet for " + book.title)
              return pageDone();
            }
            //remove extraneous GApps detail
            rows.forEach(function(row) {
              delete row.updated;
              delete row.content;
              delete row.id;
              //eliminate empty cells, which get a weird placeholder object
              for (var key in row) {
                var prop = row[key];
                if (typeof prop == "object" && "$t" in prop && prop.$t == "") {
                  row[key] = "";
                }
              }
            });
            var filename = "json/" + camelCase(book.title) + "_" + camelCase(page.title) + ".json";
            grunt.file.write(filename, JSON.stringify(rows, null, 2));
            pageDone();
          });
        }, function() {
          //when done with all sheets, continue
          bookDone();
        });
      });
    }, function() {
      return done();
    });

  });

}