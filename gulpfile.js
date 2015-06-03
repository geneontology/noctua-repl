////
//// Usage: node ./node_modules/.bin/gulp doc
////

var gulp = require('gulp');
var jsdoc = require("gulp-jsdoc");

gulp.task('default', function() {
    console.log("'allo 'allo!");
});

gulp.task('doc', function() {
    gulp.src("./bin/*.js")
	.pipe(jsdoc('./doc'))
});
