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
$expectedJobs = @(
  'Aufbau',
  'Teilzeit Barkeeper nach Lust und Laune',
  'Jemand der mit der Musikbox verbunden ist',
  'Dinge',
  ('Abbau & Brunch am n' + [char]0x00E4 + 'chsten Tag'),
  ('Getr' + [char]0x00E4 + 'nkeeinkauf mit Auto (Freitag oder Samstag)')
)
$expectedJobDescriptions = @(
  'Hilf dabei, den Veranstaltungsbereich vorzubereiten und beim Aufbau mit anzupacken. Welche Handgriffe gerade gebraucht werden, stimmen wir gemeinsam ab.',
  ('Unterst' + [char]0x00FC + 'tze beim Getr' + [char]0x00E4 + 'nke-Ausschank so lange und so oft, wie es f' + [char]0x00FC + 'r dich passt. Eine feste Schicht oder bestimmte Dauer ist nicht vorgegeben.'),
  ('Hilf dabei, die Musikbox mit dem passenden Ger' + [char]0x00E4 + 't zu verbinden, damit w' + [char]0x00E4 + 'hrend der Feier Musik abgespielt werden kann.'),
  ('F' + [char]0x00FC + 'r verschiedene Dinge, bei denen eine helfende Hand gebraucht wird. Was genau anf' + [char]0x00E4 + 'llt, kl' + [char]0x00E4 + 'ren wir gemeinsam.'),
  ('Hilf beim Aufr' + [char]0x00E4 + 'umen nach dem Geburtstag und sei am n' + [char]0x00E4 + 'chsten Tag beim Buffet-Brunch dabei. Diese Auswahl umfasst Abbau und Brunch gemeinsam.'),
  ('Hilf am Freitag oder Samstag mit deinem Auto beim Getr' + [char]0x00E4 + 'nkeeinkauf. Die genaue Zeit und die weiteren Absprachen stimmen wir gemeinsam ab.')
)

function Get-UnicodeCodePointCount {
  param([Parameter(Mandatory)][string]$Value)

  $count = 0
  for ($index = 0; $index -lt $Value.Length; $index++) {
    if (
      [char]::IsHighSurrogate($Value[$index]) -and
      $index + 1 -lt $Value.Length -and
      [char]::IsLowSurrogate($Value[$index + 1])
    ) {
      $index++
    }
    $count++
  }
  return $count
}

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
  AND name IN (
    'fresh_rsvps', 'drink_options', 'fresh_rsvp_drink_selections',
    'job_options', 'fresh_rsvp_job_allocations'
  );
"@
  $tableNames = @($tables | ForEach-Object { $_.name } | Sort-Object)
  $expectedTables = @(
    'drink_options',
    'fresh_rsvp_drink_selections',
    'fresh_rsvp_job_allocations',
    'fresh_rsvps',
    'job_options'
  )
  if (Compare-Object $expectedTables $tableNames) {
    throw "Fresh RSVP schema tables are missing: $($tableNames -join ', ')"
  }

  $jobIndexes = Get-D1Rows -PersistencePath $PersistencePath -Sql @"
SELECT name FROM sqlite_master
WHERE type = 'index' AND name = 'fresh_rsvp_job_allocations_option_idx';
"@
  if ($jobIndexes.Count -ne 1) {
    throw 'The job allocation lookup index is missing.'
  }
  $jobForeignKeys = Get-D1Rows -PersistencePath $PersistencePath -Sql @"
PRAGMA foreign_key_list(fresh_rsvp_job_allocations);
"@
  $hasRsvpForeignKey = @($jobForeignKeys | Where-Object {
    $_.table -eq 'fresh_rsvps' -and $_.from -eq 'fresh_rsvp_id' -and $_.to -eq 'id'
  }).Count -eq 1
  $hasOptionForeignKey = @($jobForeignKeys | Where-Object {
    $_.table -eq 'job_options' -and $_.from -eq 'job_option_id' -and $_.to -eq 'id'
  }).Count -eq 1
  if ($jobForeignKeys.Count -ne 2 -or -not $hasRsvpForeignKey -or -not $hasOptionForeignKey) {
    throw 'Job allocations must reference both their RSVP and catalog option.'
  }

  $drinks = Get-D1Rows -PersistencePath $PersistencePath -Sql @"
SELECT label, is_fixed FROM drink_options WHERE is_fixed = 1 ORDER BY label COLLATE NOCASE;
"@
  $drinkLabels = @($drinks | ForEach-Object { $_.label } | Sort-Object)
  $sortedExpectedDrinks = @($expectedDrinks | Sort-Object)
  if (($drinkLabels.Count -ne 8) -or (Compare-Object $sortedExpectedDrinks $drinkLabels)) {
    throw "Expected exactly the eight fixed drink labels; found: $($drinkLabels -join ', ')"
  }

  $jobs = Get-D1Rows -PersistencePath $PersistencePath -Sql @"
SELECT label, description, is_fixed, display_order, max_capacity
FROM job_options ORDER BY display_order;
"@
  $jobLabels = @($jobs | ForEach-Object { $_.label })
  if ($jobLabels.Count -ne 6) {
    throw "Expected exactly six fixed jobs in the specified order; found: $($jobLabels -join ', ')"
  }
  for ($index = 0; $index -lt $expectedJobs.Count; $index++) {
    if ($jobLabels[$index] -cne $expectedJobs[$index]) {
      throw "Job catalog order mismatch at position $($index + 1): expected '$($expectedJobs[$index])', found '$($jobLabels[$index])'."
    }
  }

  for ($index = 0; $index -lt $jobs.Count; $index++) {
    $job = $jobs[$index]
    if ($job.is_fixed -ne 1 -or $job.display_order -ne ($index + 1)) {
      throw "Job '$($job.label)' has an invalid fixed flag or display order."
    }
    if ([string]::IsNullOrWhiteSpace($job.description)) {
      throw "Job '$($job.label)' has an empty description."
    }
    if ($job.description -cne $expectedJobDescriptions[$index]) {
      throw "Job '$($job.label)' does not match the reviewed seeded description."
    }
    if ((Get-UnicodeCodePointCount -Value $job.description) -lt 40) {
      throw "Job '$($job.label)' description is shorter than 40 Unicode code points."
    }

    if ($index -eq 0) {
      if ($job.max_capacity -ne 15) {
        throw "Job '$($job.label)' must have capacity 15."
      }
    } elseif ($null -ne $job.max_capacity) {
      throw "Uncapped job '$($job.label)' must have a NULL capacity."
    }
  }

  if ($jobs[5].label -cne $expectedJobs[5] -or $jobs[5].is_fixed -ne 1) {
    throw 'The seeded drinks-shopping option must be a fixed job, not a guest suggestion.'
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
INSERT INTO job_options (id, label, normalized_label, description, is_fixed, max_capacity)
VALUES ('phase9-null-capacity', 'Uncapped test job', 'uncapped test job', 'A test job with no maximum capacity.', 0, NULL);
"@
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO job_options (id, label, normalized_label, description, is_fixed, max_capacity)
VALUES ('phase9-zero-capacity', 'Zero capacity test job', 'zero capacity test job', 'A test job with an explicit zero capacity.', 0, 0);
"@
  $validCapacities = Get-D1Rows -PersistencePath $PersistencePath -Sql @"
SELECT id, max_capacity FROM job_options
WHERE id IN ('phase9-null-capacity', 'phase9-zero-capacity')
ORDER BY id;
"@
  if (
    $validCapacities.Count -ne 2 -or
    $null -ne $validCapacities[0].max_capacity -or
    $validCapacities[1].max_capacity -ne 0
  ) {
    throw 'NULL and zero job capacities must remain valid distinct values.'
  }
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO job_options (id, label, normalized_label, description, is_fixed, max_capacity)
VALUES ('phase9-negative-capacity', 'Negative capacity test job', 'negative capacity test job', 'This capacity must be rejected.', 0, -1);
"@ -ExpectFailure -ExpectedError 'CHECK constraint failed'
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO job_options (id, label, normalized_label, description, is_fixed, max_capacity)
VALUES ('phase9-empty-label', '   ', 'empty label', 'A test description that is long enough.', 0, NULL);
"@ -ExpectFailure -ExpectedError 'CHECK constraint failed'
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO job_options (id, label, normalized_label, description, is_fixed, max_capacity)
VALUES ('phase9-empty-description', 'Empty description test', 'empty description test', '   ', 0, NULL);
"@ -ExpectFailure -ExpectedError 'CHECK constraint failed'
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO job_options (id, label, normalized_label, description, is_fixed, max_capacity)
VALUES ('phase9-duplicate-normalized-label', 'Another Aufbau', 'aufbau', 'A duplicate normalized label must fail.', 0, NULL);
"@ -ExpectFailure -ExpectedError 'UNIQUE constraint failed'
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvp_job_allocations (fresh_rsvp_id, job_option_id, assigned_count)
VALUES ('phase9-max-group', 'aufbau', 2);
"@
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvp_job_allocations (fresh_rsvp_id, job_option_id, assigned_count)
VALUES ('phase9-max-group', 'dinge', 0);
"@ -ExpectFailure -ExpectedError 'CHECK constraint failed'
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvp_job_allocations (fresh_rsvp_id, job_option_id, assigned_count)
VALUES ('phase9-max-group', 'dinge', -1);
"@ -ExpectFailure -ExpectedError 'CHECK constraint failed'
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvp_job_allocations (fresh_rsvp_id, job_option_id, assigned_count)
VALUES ('phase9-max-group', 'missing-job-option', 1);
"@ -ExpectFailure -ExpectedError 'FOREIGN KEY constraint failed'
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvp_job_allocations (fresh_rsvp_id, job_option_id, assigned_count)
VALUES ('phase9-decline', 'aufbau', 1);
"@ -ExpectFailure -ExpectedError 'job allocations require a coming RSVP'
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvps (id, name, attendance, group_size, submitted_at, host_ref)
VALUES ('phase9-job-coming', 'Coming job guest', 'coming', 1, '2026-01-01T00:00:00Z', 0);
"@
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
INSERT INTO fresh_rsvp_job_allocations (fresh_rsvp_id, job_option_id, assigned_count)
VALUES ('phase9-job-coming', 'aufbau', 1);
"@
  $null = Invoke-D1 -PersistencePath $PersistencePath -Sql @"
UPDATE fresh_rsvps SET attendance = 'not_coming', group_size = 0 WHERE id = 'phase9-job-coming';
"@ -ExpectFailure -ExpectedError 'declining RSVP cannot have job allocations'
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
  $historicalColumnsBefore = Get-D1Rows -PersistencePath $populatedPersistence -Sql @"
PRAGMA table_info(rsvps);
"@
  $historicalColumnNamesBefore = @($historicalColumnsBefore | ForEach-Object { $_.name })
  $expectedHistoricalColumnsBefore = @('id', 'name', 'contact_method', 'attendees', 'submitted_at')
  if (($historicalColumnNamesBefore -join "`n") -cne ($expectedHistoricalColumnsBefore -join "`n")) {
    throw "Historical RSVP columns differ before migration: $($historicalColumnNamesBefore -join ', ')"
  }
  $null = Invoke-Wrangler -Arguments @(
    'd1', 'migrations', 'apply', 'birthday-rsvps',
    '--local', '--persist-to', $populatedPersistence
  )
  Assert-NewSchema -PersistencePath $populatedPersistence

  $historicalColumnsAfter = Get-D1Rows -PersistencePath $populatedPersistence -Sql @"
PRAGMA table_info(rsvps);
"@
  $historicalColumnNamesAfter = @($historicalColumnsAfter | ForEach-Object { $_.name })
  $expectedHistoricalColumnsAfter = @('id', 'name', 'contact_method', 'attendees', 'submitted_at', 'host_ref')
  if (($historicalColumnNamesAfter -join "`n") -cne ($expectedHistoricalColumnsAfter -join "`n")) {
    throw "Historical RSVP columns differ after migration: $($historicalColumnNamesAfter -join ', ')"
  }
  if (($historicalColumnNamesBefore -join "`n") -cne ($historicalColumnNamesAfter[0..4] -join "`n")) {
    throw 'Migration changed the historical RSVP column order or names.'
  }

  $historicalRows = Get-D1Rows -PersistencePath $populatedPersistence -Sql @"
SELECT id, name, contact_method, attendees, hex(submitted_at) AS submitted_at_hex, host_ref
FROM rsvps WHERE id = '$sentinel';
"@
  if ($historicalRows.Count -ne 1) {
    throw "Expected one historical RSVP sentinel, found $($historicalRows.Count)"
  }
  $historical = $historicalRows[0]
  $expectedTimestampHex = [BitConverter]::ToString(
    [System.Text.Encoding]::UTF8.GetBytes('2025-11-30T12:34:56.000Z')
  ).Replace('-', '')
  if (
    $historical.id -ne $sentinel -or
    $historical.name -ne 'Historical guest' -or
    $historical.contact_method -ne 'email' -or
    $historical.attendees -ne 4 -or
    $historical.submitted_at_hex -ne $expectedTimestampHex -or
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
