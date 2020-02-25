var gu = require('gulp');
var rev = require('gulp-rev-all');
var inje = require('gulp-inject');
var cssmini = require('gulp-clean-css');
var jsmini = require('gulp-uglify-es').default;
//var pipeline = require('readable-stream').pipeline;

gu.task('mini-rev', function(){
    var index = gu.src('./views/index.ejs');
    gu.src('./public/css/main.css').pipe(cssmini({debug: true}, (details) => {
        console.log(`${details.name}: ${details.stats.originalSize}`);
        console.log(`${details.name}: ${details.stats.minifiedSize}`);
      }))
    .pipe(rev.revision())
    .pipe(gu.dest('../domkie-production/public/css/'));

    gu.src('./public/js/main.js')
    .pipe( jsmini())
    .pipe(rev.revision())
    .pipe(gu.dest('../domkie-production/public/js'))
    
    return gu.src('./views/index.ejs').pipe(inje(gu.src(['../domkie-production/public/js/*.js', '../domkie-production/public/css/*.css'], {read: false})))
    .pipe(gu.dest('../domkie-production/views/'))
})

gu.task('copy', function(){
    return gu.src(['./modu/*','./public/img/*','./views/partials/*','./package.json']).pipe(gu.dest('../domkie-production'))
})

gu.task('default')