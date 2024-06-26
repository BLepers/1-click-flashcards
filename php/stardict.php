<?php

spl_autoload_register(function ($class_name) {
   $class_name = str_replace("\\", "/", $class_name);
   include $class_name . '.php';
});

use StarDict\StarDict;

$dict = StarDict::createFromFiles('../dict/dict.ifo', '../dict/dict.idx', '../dict/dict.dict.dz');

function abr($match) {
    switch ($match[1]) {
        case 'BrE':
            return 'British English';
        case 'NAmE':
            return 'North American English';
        case 'AustralE':
            return 'Australian English';
        case 'SAfrE':
            return 'South African English';
        default:
            return '';
    }
}

function rref($match) {
    return '';
}

/* Get the definition and do minimal formatting */
$word = $_GET['word'];
foreach ($dict->get($word) as $result) {
    $found = true;
    $value = $result->getValue();
    $value = preg_replace('/<k>.*<\/k>/', '', $value);
    $value = preg_replace_callback('/<abr>(\d+|\w+)<\/abr>/', "abr", $value);
    $value = preg_replace_callback('/<rref>((?:\d|\w|_|-|\.)+)<\/rref>/', "rref", $value);
    $value = preg_replace('/<c c="(\w+)">/', '<span style="color:\1">', $value);
    $value = preg_replace('/<c>/', '<span>', $value);
    $value = preg_replace('/<\/c>/', '</span>', $value);
    $value = preg_replace('/<kref>([^<]+)<\/kref>/', '<a href="!#\1">\1</a>', $value);
    echo $value;
}

?>
