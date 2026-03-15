const { FileTypeManager } = require('./dist/download/file-type-manager');

async function testFileTypeManager() {
  console.log('🧪 Testing FileTypeManager...\n');
  
  const fileTypeManager = new FileTypeManager();
  
  // Test 1: Supported file types
  console.log('📋 Test 1: Supported file types');
  const supportedExtensions = fileTypeManager.getSupportedExtensions();
  console.log(`✅ Supported extensions: ${supportedExtensions.join(', ')}`);
  console.log(`✅ Total supported types: ${supportedExtensions.length}\n`);
  
  // Test 2: File type detection
  console.log('🔍 Test 2: File type detection');
  const testFiles = [
    'document.pdf',
    'spreadsheet.xlsx',
    'presentation.pptx',
    'archive.zip',
    'image.jpg',
    'unknown.xyz'
  ];
  
  for (const file of testFiles) {
    const fileType = fileTypeManager.detectFileType(file);
    if (fileType) {
      console.log(`✅ ${file} -> ${fileType.description} (${fileType.extension})`);
    } else {
      console.log(`❌ ${file} -> Unsupported file type`);
    }
  }
  console.log();
  
  // Test 3: File size validation
  console.log('📏 Test 3: File size validation');
  const pdfType = fileTypeManager.detectFileType('test.pdf');
  const testSizes = [1000000, 50000000, 150000000]; // 1MB, 50MB, 150MB
  
  for (const size of testSizes) {
    const isValid = fileTypeManager.validateFileSize(size, pdfType);
    const sizeStr = size < 1024 ? `${size} bytes` : 
                   size < 1024*1024 ? `${(size/1024).toFixed(2)} KB` :
                   `${(size/(1024*1024)).toFixed(2)} MB`;
    console.log(`${sizeStr}: ${isValid ? '✅ Valid' : '❌ Too large'}`);
  }
  console.log();
  
  // Test 4: Safe filename generation
  console.log('🛡️ Test 4: Safe filename generation');
  const testFilenames = [
    'document.pdf',
    'file with spaces.docx',
    '../../../malicious.txt',
    'normal-file.xlsx'
  ];
  
  for (const filename of testFilenames) {
    const fileType = fileTypeManager.detectFileType(filename);
    if (fileType) {
      const safeName = fileTypeManager.generateSafeFilename(filename, fileType, 1, 2, 3);
      console.log(`✅ ${filename} -> ${safeName}`);
    }
  }
  console.log();
  
  // Test 5: File categorization
  console.log('📂 Test 5: File categorization');
  const categories = ['pdf', 'xlsx', 'pptx', 'zip', 'jpg'].map(ext => {
    const fileType = fileTypeManager.detectFileType(`test.${ext}`);
    return fileType ? fileTypeManager.categorizeFile(fileType) : 'unknown';
  });
  console.log(`✅ File categories: ${[...new Set(categories)].join(', ')}\n`);
  
  console.log('🎉 FileTypeManager tests completed successfully!');
}

// Run the test
testFileTypeManager().catch(console.error);