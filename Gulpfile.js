var gulp = require('gulp');
var browserify = require('gulp-browserify');
var rename = require('gulp-rename');
var preprocess = require('gulp-preprocess');
var process = require('process');
var livereload = require('gulp-livereload');
var webserver = require('gulp-webserver');
var sass = require('gulp-sass');
var runSequence = require('run-sequence');
var glob = require('glob');
var fs = require('fs');
var marked = require('meta-marked');

var build_options = {
	'isDev': true
};

var posts = glob('./posts/**/*.js', {cwd: './app', sync: true});

var external_libraries = [
	'jquery', 'flux', 'react', 'moment'
];

/**
 * Browserify the external vendors and move them to ./build
 **/
gulp.task('build:vendor', function() {
  return gulp.src('./app/noop.js', {read: false})
		.pipe(browserify({
			debug: process.env.NODE_ENV != 'production'
		}))
		.on('prebundle', function(bundle) {
			external_libraries.forEach(function(lib) {
				bundle.require(lib);
			});
		})
		.pipe(rename('vendor.js'))
		.pipe(gulp.dest('./build'));
});

/**
 * Browserify the posts and move it to ./build
 **/
gulp.task('build:posts', function() {
});

/**
 * Browserify the main file and move it to ./build
 **/
gulp.task('build:app', function() {
  return gulp.src('./app/main.js', {read: false})
		.pipe(browserify({
			transform: ['reactify'],
			debug: process.env.NODE_ENV != 'production'
		}))
		.on('prebundle', function(bundle) {
			external_libraries.forEach(function(lib) {
				bundle.external(lib);
			});
		})
		.on('error', function(err) {console.error(err)})
		.pipe(rename('app.js'))
		.pipe(gulp.dest('./build'));
});

/**
 * Precompile the style and move it to ./build
 **/
gulp.task('move:css', function() {
  return gulp.src('./app/app.scss')
    .pipe(sass())
    .pipe(gulp.dest('./build'));
});

/**
 * Preprocess index.html and move it to ./build
 **/
gulp.task('move:html', function() {
  return gulp.src('./app/index.html')
		.pipe(preprocess({
			context: build_options
		}))
		.pipe(gulp.dest('./build'));
});

/**
 * Move the posts to ./build
 **/
//gulp.task('move:posts', function() {
//  return gulp.src('./app/posts/**/*')
//    .pipe(gulp.dest('./build/posts'));
//});

/**
 * Move the static assets to ./build
 **/
gulp.task('move:assets', function() {
  return gulp.src('./app/assets/**/*')
    .pipe(gulp.dest('./build/assets'));
});

gulp.task('build', function(cb) {
  runSequence(['build:vendor', 'build:posts', 'build:app', 'build:blog'], cb)
});

gulp.task('move', function(cb) {
  runSequence(['move:html', 'move:css', /*'move:posts',*/ 'move:assets'], cb);
});

gulp.task('main', function(cb) {
  runSequence('build', 'move', cb);
});

gulp.task('build:blog', function() {
  var files = fs.readdirSync('./app/posts');
  var list = files.map(function(e) {
    var content = fs.readFileSync('./app/posts/' + e, {encoding: 'utf8'});
    var markdown = marked(content);

    markdown.meta.slug = e.split('.md')[0];
    return markdown;
  });
  build_options.json = JSON.stringify(list);
});

gulp.task('serve', function() {
  return gulp.src('./build')
    .pipe(webserver({
      port: process.env.PORT || 8000
    }));
});

gulp.task('watch', function() {
  var watch = function(path, task) {
    gulp.watch(path, function(events) {
      console.log(events.path + ' changed. running task ' + task + '.');
      runSequence(task, function() {
        livereload.changed(events.path);
      })
    }).on('change', function(file) {
    });
  };

  livereload.listen();

  watch('./app/index.html', 'move:html');
  watch('./app/posts/**/*.md', 'build:blog');
  watch(['./app/**/*.js', '!./app/posts**/*.js'], 'build:app');
  watch('./app/app.scss', 'move:css');
  watch('./app/assets/**/*', 'move:assets');
});

gulp.task('default', function(cb) {
	build_options.isDev = process.env.NODE_ENV != 'production';
	console.log("running in " + (build_options.isDev ? 'development mode' : 'production mode'));
  if (build_options.isDev) {
    build_options.isDev = true;
    runSequence('main', 'watch', 'serve', cb);
  }
  else {
    build_options.isDev = false;
    runSequence('main', cb);
  }
});

