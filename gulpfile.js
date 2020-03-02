var gu = require('gulp');
var rev = require('gulp-rev-all');
var inje = require('gulp-inject');
var cssmini = require('gulp-clean-css');
var jsmini = require('gulp-uglify-es').default;
var del = require('del');
//var pipeline = require('readable-stream').pipeline;

gu.task('del-static', function(){
    return del([
        '../dkpro/public/css/*',
        '../dkpro/public/js/*'
    ]);
});

gu.task('mini-rev', function(){
    var index = gu.src('./views/index.ejs');
    gu.src('./public/css/main.css').pipe(cssmini({debug: true}, (details) => {
        console.log(`${details.name}: ${details.stats.originalSize}`);
        console.log(`${details.name}: ${details.stats.minifiedSize}`);
      }))
    .pipe(rev.revision())
    .pipe(gu.dest('../dkpro/public/css/'));

    return gu.src('./public/js/main.js')
    .pipe( jsmini())
    .pipe(rev.revision())
    .pipe(gu.dest('../dkpro/public/js'));
    
});

gu.task('inject', function(){
    return gu.src('./views/index.ejs').pipe(inje(gu.src(['../dkpro/public/css/*.css'], {read: false}),{ignorePath:'../dkpro/public/', addRootSlash: false}))
    .pipe(inje(gu.src(['../dkpro/public/js/*.js'], {read: false}), {
        ignorePath: '../dkpro/public/', addRootSlash: false,
        transform: function(filepath){
            return '<script async defer type="text/javascript" src="' + filepath + '"></script>';
        }
    }))
    .pipe(gu.dest('../dkpro/views/'));

});

gu.task('copy', function(){
    gu.src(['./modu/*'])
    .pipe(gu.dest('../dkpro/modu/'));

    gu.src([ './public/img/*'])
    .pipe(gu.dest('../dkpro/public/img/'));

    gu.src(['./views/partials/*'])
    .pipe(gu.dest('../dkpro/views/partials/'));

    gu.src(['./views/404.ejs','./views/500.ejs'])
    .pipe(gu.dest('../dkpro/views/'));

    return gu.src(['./package.json', './server.js'])
    .pipe(gu.dest('../dkpro/'));
});

gu.task('default', gu.series(['del-static','mini-rev','inject','copy']));