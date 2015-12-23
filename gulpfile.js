var gulp = require('gulp');
var clean = require('gulp-clean');
var pandoc = require('gulp-pandoc');
var replace = require('gulp-replace');
var rename = require('gulp-rename');
var gutil = require('gulp-util');
var runSequence = require('run-sequence');

var childProcess = require('child_process');
var exec = childProcess.exec;
var execSync = childProcess.execSync;
var argv = require('yargs').argv;

var DIR_TEMP = 'temp/';
var DIR_DIST = 'dist/';
// 默认项目为thesis-simple
var BASE_NAME = argv.thesis || 'thesis-simple';
var DIR_PROJECT = 'src/' + BASE_NAME + '/';

gulp.task('pandoc-parts', function() {
    return gulp.src(['src/*.md', '!src/thesis.md'])
        .pipe(pandoc({
            from: 'markdown',
            to: 'latex',
            ext: '.tex',
            args: ['--chapters']
        }))
        .pipe(gulp.dest(DIR_TEMP));
});

gulp.task('pandoc-thesis', function(cb) {
    var util = require('util');
    var fs = require('fs');
    var cmd = 'pandoc -s --template=template/template.tex --chapters -o temp/thesis_pre.tex %sthesis.md';
    var finalCmd = util.format(cmd, DIR_PROJECT);
    gutil.log('Executing:', gutil.colors.blue(finalCmd));

    if (!fs.existsSync(DIR_TEMP)) {
        fs.mkdirSync(DIR_TEMP);
    }
    exec(finalCmd, function(err, stdout, stderr) {
        if (err) {
            return cb(err);
        }
        // 让gulp知道任务到此已完成
        cb();
    });
});

gulp.task('copy-template', function() {
    return gulp.src([
        'template/hustthesis.bst',
        'template/hustthesis.cls',
        'template/hust-title.eps',
        'template/hust-title.pdf'
    ]).pipe(gulp.dest(DIR_TEMP));
});

gulp.task('copy-src', function() {
    return gulp.src([
        DIR_PROJECT + '*.tex',
        DIR_PROJECT + 'figures/**/*',
        DIR_PROJECT + 'ref.bib'
    ], {base: DIR_PROJECT}).pipe(gulp.dest(DIR_TEMP));
});

gulp.task('pre', function() {
    return gulp.src('temp/thesis_pre.tex')
        .pipe(replace('\\includegraphics{', '\\includegraphics[width=\\maxwidth]{'))
        .pipe(rename('thesis.tex'))
        .pipe(gulp.dest(DIR_TEMP));
});

gulp.task('pdf', function(cb) {
    // var latexCmd = 'xelatex thesis';
    var latexCmd = argv.lualatex ? 'lualatex thesis' : 'xelatex thesis';
    var bibtexCmd = 'bibtex thesis';

    process.chdir(DIR_TEMP);
    gutil.log('Executing:', gutil.colors.blue(latexCmd));
    execSync(latexCmd);
    gutil.log('Executing:', gutil.colors.blue(bibtexCmd));
    execSync(bibtexCmd);
    gutil.log('Executing:', gutil.colors.blue(latexCmd));
    execSync(latexCmd);
    gutil.log('Executing:', gutil.colors.blue(latexCmd));
    execSync(latexCmd);
    process.chdir('../');

    // 让gulp知道任务到此已完成
    cb();
});

gulp.task('copy-pdf', function() {
    return gulp.src('temp/thesis.pdf')
        .pipe(rename(BASE_NAME + '.pdf'))
        .pipe(gulp.dest(DIR_DIST));
});

gulp.task('clean', function() {
    return gulp.src(DIR_TEMP, {read: false})
        .pipe(clean());
});

gulp.task('default', function(cb) {
    gutil.log(gutil.colors.green('Project directory: ' + DIR_PROJECT));
    runSequence(
        // 'clean',
        // 'pandoc-parts',
        'pandoc-thesis',
        ['copy-template', 'copy-src'],
        'pre',
        'pdf',
        'copy-pdf',
        cb
    );
});
