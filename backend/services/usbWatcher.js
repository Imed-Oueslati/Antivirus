const { execSync } = require('child_process');

let knownDrives = new Set();

function getDrives() {
  try {
    // Use PowerShell instead of wmic (wmic removed in Windows 11)
    const out = execSync(
      'powershell -NoProfile -Command "Get-PSDrive -PSProvider FileSystem | Select-Object -ExpandProperty Name"',
      { timeout: 5000 }
    ).toString();

    const drives = new Set();
    out.split('\n').forEach(line => {
      const d = line.trim();
      // Only single letters = real drives (C, D, E, F...)
      if (d.length === 1 && d.match(/[A-Z]/i)) {
        drives.add(d.toUpperCase() + ':');
      }
    });
    return drives;
  } catch (e) {
    return new Set();
  }
}

function isRemovable(drive) {
  try {
    const letter = drive.replace(':', '');
    const out = execSync(
      `powershell -NoProfile -Command "(Get-WmiObject Win32_LogicalDisk -Filter 'DeviceID=\\"${letter}:\\"').DriveType"`,
      { timeout: 3000 }
    ).toString().trim();
    return out === '2'; // DriveType 2 = Removable
  } catch {
    return false;
  }
}

module.exports = function startUsbWatcher(io) {
  // Init with current drives
  knownDrives = getDrives();
  console.log('✅ USB watcher started (PowerShell mode). Known drives:', [...knownDrives]);

  setInterval(() => {
    try {
      const current = getDrives();

      // New drive plugged in
      for (const drive of current) {
        if (!knownDrives.has(drive)) {
          console.log('🔌 New drive detected:', drive);

          if (isRemovable(drive)) {
            console.log('💾 USB removable drive:', drive);
            io.emit('usb_detected', { drive, timestamp: new Date(), scanning: true });
            io.emit('usb_scan_started', { drive, timestamp: new Date() });
          } else {
            console.log('💿 Non-removable drive (skipping):', drive);
          }

          knownDrives.add(drive);
        }
      }

      // Drive removed
      for (const drive of knownDrives) {
        if (!current.has(drive)) {
          console.log('🔴 Drive removed:', drive);
          io.emit('usb_removed', { drive, timestamp: new Date() });
          knownDrives.delete(drive);
        }
      }
    } catch (e) {
      // Silently ignore watcher errors
    }
  }, 3000);
};