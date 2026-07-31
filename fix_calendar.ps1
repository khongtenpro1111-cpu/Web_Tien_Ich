
$content = Get-Content -Path src/index.css -Raw
$content = $content -replace "input\[type=`"datetime-local`"\] \{", "input[type=`"datetime-local`"] {`n  color-scheme: dark;"
if ($content -notmatch "color-scheme: dark;") {
    $content += "`ninput[type=`"datetime-local`"], input[type=`"date`"] { color-scheme: dark; }`n"
}
Set-Content -Path src/index.css -Value $content

