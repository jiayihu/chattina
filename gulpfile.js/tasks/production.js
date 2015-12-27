var gulp         = require('gulp');
var runSequence = require('run-sequence');

var productionTask = function(cb) {
  runSequence(
    'clean',
    ['fonts', 'images', 'static'],
    ['html', 'css', 'scripts'],
    'deploy'
  );
};

gulp.task('production', productionTask);
