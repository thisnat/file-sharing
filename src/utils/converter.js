function bytesToMB(bytes) {
  // 1 MB = 1024 * 1024 bytes (1024^2)
  const megabytes = bytes / (1024 * 1024)
  return megabytes
}

module.exports = bytesToMB
