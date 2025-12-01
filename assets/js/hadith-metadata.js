const HadithMetadata = {
  editions: {}, // Map of editionID -> details
  books: {}, // Map of bookID -> { name, editions }
  
  // API Base URL
  apiBase: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1',

  async init() {
    try {
      console.log("Initializing Hadith Metadata...");
      const response = await fetch(`${this.apiBase}/editions.json`);
      const data = await response.json();
      
      // Data structure: { "bukhari": { "name": "Sahih al Bukhari", "collection": [...] }, ... }
      this.processEditions(data);
      this.populateDropdowns();
      
      console.log("Hadith Metadata initialized", this.books);
    } catch (e) {
      console.error("Failed to load Hadith metadata", e);
    }
  },

  processEditions(data) {
    // Iterate through each book
    Object.keys(data).forEach(bookId => {
      const bookData = data[bookId];
      const bookName = bookData.name;
      const collection = bookData.collection || [];
      
      // Store book info
      this.books[bookId] = {
        id: bookId,
        name: bookName,
        editions: []
      };
      
      // Process each edition in the collection
      collection.forEach(edition => {
        const editionInfo = {
          id: edition.name,
          bookId: bookId,
          language: edition.language,
          author: edition.author,
          direction: edition.direction,
          hasArabic: edition.language === 'Arabic',
          ...edition
        };
        
        this.books[bookId].editions.push(editionInfo);
        this.editions[edition.name] = editionInfo;
      });
    });
  },


  populateDropdowns() {
    const bookSelect = document.getElementById('hadithBook');
    const editionSelect = document.getElementById('hadithEdition');
    
    if (!bookSelect || !editionSelect) {
      console.warn("Hadith dropdowns not found in DOM");
      return;
    }
    
    // Populate Books
    bookSelect.innerHTML = '';
    
    // Sort books alphabetically by name
    const sortedBooks = Object.values(this.books).sort((a, b) => a.name.localeCompare(b.name));
    
    sortedBooks.forEach(book => {
      const option = document.createElement('option');
      option.value = book.id;
      option.textContent = book.name;
      bookSelect.appendChild(option);
    });
    
    // Trigger update for editions
    this.updateEditions();
    
    // Add event listener
    bookSelect.addEventListener('change', () => this.updateEditions());
  },

  updateEditions() {
    const bookSelect = document.getElementById('hadithBook');
    const editionSelect = document.getElementById('hadithEdition');
    
    if (!bookSelect || !editionSelect) return;
    
    const selectedBookId = bookSelect.value;
    const bookData = this.books[selectedBookId];
    
    if (!bookData) return;
    
    editionSelect.innerHTML = '';
    
    // Sort editions: English first, then others alphabetically
    const sortedEditions = [...bookData.editions].sort((a, b) => {
      if (a.language === 'English' && b.language !== 'English') return -1;
      if (a.language !== 'English' && b.language === 'English') return 1;
      return a.language.localeCompare(b.language);
    });

    sortedEditions.forEach(edition => {
      const option = document.createElement('option');
      option.value = edition.id;
      option.textContent = `${edition.language}${edition.author && edition.author !== 'Unknown' ? ' - ' + edition.author : ''}`;
      editionSelect.appendChild(option);
    });
    
    // Trigger any change events needed by the app
    if (window.onAnyInputChange) window.onAnyInputChange();
  },
  
  getArabicEditionForBook(bookId) {
    const book = this.books[bookId];
    if (!book) return null;
    
    // Find the first Arabic edition (prefer without "1" suffix)
    const arabicEdition = book.editions.find(e => e.language === 'Arabic' && !e.id.endsWith('1'));
    if (arabicEdition) return arabicEdition.id;
    
    // Fallback to any Arabic edition
    const anyArabic = book.editions.find(e => e.language === 'Arabic');
    return anyArabic ? anyArabic.id : null;
  }
};

window.hadithMetadata = HadithMetadata;
