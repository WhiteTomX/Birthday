$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cleanPersistence = Join-Path '.wrangler' 'phase-9-migration-clean'
$populatedPersistence = Join-Path '.wrangler' 'phase-9-migration-populated'
$persistencePaths = @($cleanPersistence, $populatedPersistence)
$expectedDrinks = @(
  'Bier',
  'Wein',
  'Sekt',
  'Kola',
  'Spezi',
  'Fruchtlimonaden',
  'Wasser',
  'alkoholfreies Bier'
)

function Invoke-Wrangler {
  param(
    [Parameter(Mandatory)]
    [string[]]$Arguments,
    [switch]$ExpectFailure,
    [string]$ExpectedError
  )

  $output = & wrangler @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  if ($ExpectFailure) {
    if ($exitCode -eq 0) {
      throw "Expected Wrangler command to fail, but it succeeded: wrangler $($Arguments -join ' ')"
    }

    if ($ExpectedError -and (($output -join "`n") -notmatch [regex]::Escape($ExpectedError))) {
      throw "Wrangler failed for an unexpected reason: wrangler $($Arguments -join ' ')`n$($output -join "`n")"
    }

    return
  }

  if ($exitCode -ne 0) {
    throw "Wrangler command failed ($exitCode): wrangler $($Arguments -join ' ')`n$($output -join "`n")"
  }

  return $output
}

function Invoke-D1 {
  param(
    [Parameter(Mandatory)]
    [string]$PersistencePath,
    [Parameter(Mandatory)]
    [string]$Sql,
    [switch]$ExpectFailure,
    [string]$ExpectedError
  )

  return Invoke-Wrangler -Arguments @(
    'd1', 'execute', 'birthday-rsvps',
    '--local', '--persist-to', $PersistencePath,
    '--command', $Sql, '--json'
  ) -ExpectFailure:$ExpectFailure -ExpectedError $ExpectedError
}

function Get-D1Rows {
  param(
    [Parameter(Mandatory)]
    [string]$PersistencePath,
    [Parameter(Mandatory)]
    [string]$Sql
  )

  $output = Invoke-D1 -PersistencePath $PersistencePath -Sql $Sql
  $response = ($output -join "`n") | ConvertFrom-Json
  if ($response -is [array]) {
    $resultSets = $response
  } else {
    $resultSets = @($response)
  }

  $rows = @()
  foreach ($resultSet in $resultSets) {
    if ($null -ne $resultSet.results) {
      $rows += @($resultSet.results)
    }
  }

  return ,$rows
}

function Assert-NewSchema {
  param([string]$PersistencePath)

  $tables = Get-D1Rows -PersistencePath $PersistencePath -Sql @"
SELECT name FROM sqlite_master
WHERE type = 'table'
  AND name IN ('fresh_rsvps', 'drink_options', 'fresh_rsvp_drink_selections');
"@
  $tableNames = @($tables | ForEach-Object { $_.name } | Sort-Object)
  $expectedTables = @('drink_options', 'fresh_rsvp_drink_selections', 'fresh_rsvps')
  if (Compare-Object $expectedTables $tableNames) {
    throw "Fresh RSVP schema tables are missing: $($tableNames -join ', ')"
  }

  $drinks = Get-D1Rows -PersistencePath $PersistencePath -Sql @"
SELECT label FROM drink_options WHERE is_fixed = 1 ORDER BY label COLLATE NOCASE;
"@
  $drinkLabels = @($drinks | ForEach-Object { $_.label } | Sort-Object)
  $sortedExpectedDrinks = @($expectedDrinks | Sort-Object)
  if (($drinkLabels.Count -ne 8) -or (Compare-Object $sortedExpectedDrinks $drinkLabels)) {
    throw "Expected exactly the eight fixed drink labels; found: $($drinkLabels -join ', ')"
  }
}

function Assert-Constraints {
  param([string]$PersistencePath)

  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvps (id, name, attendance, group_size, submitted_at, host_ref)
VALUES ('phase9-max-group', 'Maximum group', 'coming', 10, '2026-01-01T00:00:00Z', 1);
"@
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvps (id, name, attendance, group_size, submitted_at, host_ref)
VALUES ('phase9-over-limit', 'Too many people', 'coming', 11, '2026-01-01T00:00:00Z', 0);
"@ -ExpectFailure -ExpectedError 'CHECK constraint failed'
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvps (id, name, attendance, group_size, submitted_at, host_ref)
VALUES ('phase9-invalid-host', 'Invalid host', 'coming', 1, '2026-01-01T00:00:00Z', 2);
"@ -ExpectFailure -ExpectedError 'CHECK constraint failed'
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvps (id, name, attendance, group_size, submitted_at, host_ref)
VALUES ('phase9-invalid-decline', 'Invalid decline', 'not_coming', 1, '2026-01-01T00:00:00Z', 0);
"@ -ExpectFailure -ExpectedError 'CHECK constraint failed'

  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvps (id, name, attendance, group_size, submitted_at, host_ref)
VALUES ('phase9-decline', 'Declining guest', 'not_coming', 0, '2026-01-01T00:00:00Z', 0);
"@
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvp_drink_selections (fresh_rsvp_id, drink_option_id)
VALUES ('phase9-decline', 'bier');
"@ -ExpectFailure -ExpectedError 'drink selections require a coming RSVP'
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvp_drink_selections (fresh_rsvp_id, drink_option_id)
VALUES ('phase9-max-group', 'missing-option');
"@ -ExpectFailure -ExpectedError 'FOREIGN KEY constraint failed'
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvp_drink_selections (fresh_rsvp_id, drink_option_id)
VALUES ('phase9-max-group', 'bier');
"@
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvp_drink_selections (fresh_rsvp_id, drink_option_id)
VALUES ('phase9-max-group', 'wein');
"@
  $selectionRows = Get-D1Rows -PersistencePath $PersistencePath -Sql @"
SELECT COUNT(*) AS selection_count
FROM fresh_rsvp_drink_selections WHERE fresh_rsvp_id = 'phase9-max-group';
"@
  if ($selectionRows.Count -ne 1 -or $selectionRows[0].selection_count -ne 2) {
    throw 'A coming group could not associate multiple drink options with one RSVP.'
  }
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
UPDATE fresh_rsvps SET attendance = 'not_coming', group_size = 0 WHERE id = 'phase9-max-group';
"@ -ExpectFailure -ExpectedError 'declining RSVP cannot have drink selections'
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO drink_options (id, label, is_fixed, created_at)
VALUES ('phase9-duplicate-drink', 'bier', 0, '2026-01-01T00:00:00Z');
"@ -ExpectFailure -ExpectedError 'UNIQUE constraint failed'
}

try {
  Push-Location $projectRoot
  foreach ($persistencePath in $persistencePaths) {
    if (Test-Path -LiteralPath $persistencePath) {
      Remove-Item -LiteralPath $persistencePath -Recurse -Force
    }
  }

  $sentinel = 'phase9-history-sentinel'
  $null = Invoke-Wrangler -Arguments @(
    'd1', 'execute', 'birthday-rsvps',
    '--local', '--persist-to', $cleanPersistence,
    '--file', 'schema.sql', '--json'
  )
  $null = Invoke-Wrangler -Arguments @(
    'd1', 'migrations', 'apply', 'birthday-rsvps',
    '--local', '--persist-to', $cleanPersistence
  )
  Assert-NewSchema -PersistencePath $cleanPersistence
  Assert-Constraints -PersistencePath $cleanPersistence

  $null = Invoke-Wrangler -Arguments @(
    'd1', 'execute', 'birthday-rsvps',
    '--local', '--persist-to', $populatedPersistence,
    '--file', 'schema.sql', '--json'
  )
  $null = Invoke-D1 -PersistencePath $populatedPersistence -Sql @"
INSERT INTO rsvps (id, name, contact_method, attendees, submitted_at)
VALUES ('$sentinel', 'Historical guest', 'email', 4, '2025-11-30T12:34:56.000Z');
"@
  $null = Invoke-Wrangler -Arguments @(
    'd1', 'migrations', 'apply', 'birthday-rsvps',
    '--local', '--persist-to', $populatedPersistence
  )
  Assert-NewSchema -PersistencePath $populatedPersistence

  $historicalRows = Get-D1Rows -PersistencePath $populatedPersistence -Sql @"
SELECT id, name, contact_method, attendees, submitted_at, host_ref
FROM rsvps WHERE id = '$sentinel';
"@
  if ($historicalRows.Count -ne 1) {
    throw "Expected one historical RSVP sentinel, found $($historicalRows.Count)"
  }
  $historical = $historicalRows[0]
  if (
    $historical.id -ne $sentinel -or
    $historical.name -ne 'Historical guest' -or
    $historical.contact_method -ne 'email' -or
    $historical.attendees -ne 4 -or
    $historical.submitted_at -ne '2025-11-30T12:34:56.000Z' -or
    $historical.host_ref -ne 0
  ) {
    throw "Historical RSVP changed during migration: $($historical | ConvertTo-Json -Compress)"
  }

  Write-Output 'Phase 9 migration checks passed for clean and populated local D1 databases.'
} finally {
  foreach ($persistencePath in $persistencePaths) {
    if (Test-Path -LiteralPath $persistencePath) {
      Remove-Item -LiteralPath $persistencePath -Recurse -Force
    }
  }
  if ((Get-Location).Path -eq $projectRoot) {
    Pop-Location
  }
}
