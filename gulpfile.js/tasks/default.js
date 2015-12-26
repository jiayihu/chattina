var gulp = require('gulp');
var runSequence = require('run-sequence');

var defaultTask = function(cb) {
  runSequence(
    ['html', 'css', 'scripts'],
    ['fonts', 'images', 'static'],
    'watch'
  );
};

gulp.task('default', defaultTask);
