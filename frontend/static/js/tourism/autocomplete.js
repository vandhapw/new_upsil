/**
 * Enhanced Country Autocomplete Component
 * Features: Loading indicators, smooth animations, keyboard navigation, error handling
 */

class CountryAutocomplete {
    constructor(options = {}) {
        this.inputElement = options.input;
        this.apiEndpoint = options.apiEndpoint || '/tourism/api/autocomplete_country/';
        this.provinceApiEndpoint = options.provinceApiEndpoint || '/tourism/api/provinces/';
        this.minChars = options.minChars || 2;
        this.debounceDelay = options.debounceDelay || 300;
        this.maxResults = options.maxResults || 10;
        this.searchType = options.searchType || 'country'; // 'country', 'province', or 'city'
        this.countryCode = options.countryCode || null; // Required for province/city search
        this.provinceCode = options.provinceCode || null; // Required for city search
        this.onSelect = options.onSelect || (() => {});
        this.onError = options.onError || (() => {});
        
        this.currentQuery = '';
        this.currentResults = [];
        this.selectedIndex = -1;
        this.isLoading = false;
        this.debounceTimer = null;
        this.abortController = null;
        
        this.init();
    }
    
    init() {
        if (!this.inputElement) {
            console.error('Input element is required for CountryAutocomplete');
            return;
        }
        
        this.createContainer();
        this.bindEvents();
    }
    
    createContainer() {
        // Wrap the input in a container
        const wrapper = document.createElement('div');
        wrapper.className = 'autocomplete-container';
        
        this.inputElement.parentNode.insertBefore(wrapper, this.inputElement);
        wrapper.appendChild(this.inputElement);
        
        // Add classes to input
        this.inputElement.classList.add('autocomplete-input');
        
        // Create loading spinner
        this.loadingElement = document.createElement('div');
        this.loadingElement.className = 'autocomplete-loading';
        this.loadingElement.innerHTML = '<div class="loading-spinner"></div>';
        wrapper.appendChild(this.loadingElement);
        
        // Create search icon
        this.searchIcon = document.createElement('i');
        this.searchIcon.className = 'fas fa-search autocomplete-search-icon';
        wrapper.appendChild(this.searchIcon);
        
        // Create dropdown list
        this.listElement = document.createElement('div');
        this.listElement.className = 'autocomplete-list';
        wrapper.appendChild(this.listElement);
        
        this.container = wrapper;
    }
    
    bindEvents() {
        // Input events
        this.inputElement.addEventListener('input', (e) => this.handleInput(e));
        this.inputElement.addEventListener('focus', () => this.handleFocus());
        this.inputElement.addEventListener('blur', (e) => this.handleBlur(e));
        this.inputElement.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideList();
            }
        });
    }
    
    handleInput(e) {
        const query = e.target.value.trim();
        this.currentQuery = query;
        
        // Clear previous timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Cancel previous request
        if (this.abortController) {
            this.abortController.abort();
        }
        
        if (query.length < this.minChars) {
            this.hideList();
            return;
        }
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Debounce the search
        this.debounceTimer = setTimeout(() => {
            this.searchCountries(query);
        }, this.debounceDelay);
    }
    
    handleFocus() {
        if (this.currentResults.length > 0 && this.currentQuery.length >= this.minChars) {
            this.showList();
        }
    }
    
    handleBlur(e) {
        // Delay hiding to allow clicks on dropdown items
        setTimeout(() => {
            if (!this.container.contains(document.activeElement)) {
                this.hideList();
            }
        }, 150);
    }
    
    handleKeydown(e) {
        if (!this.isListVisible()) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.navigateDown();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigateUp();
                break;
            case 'Enter':
                e.preventDefault();
                this.selectCurrentItem();
                break;
            case 'Escape':
                this.hideList();
                this.inputElement.blur();
                break;
        }
    }
    
    showTypingIndicator() {
        this.listElement.innerHTML = `
            <div class="autocomplete-typing">
                <span>Searching</span>
                <div class="typing-dots">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            </div>
        `;
        this.showList();
    }
    
    async searchCountries(query) {
        console.log('searchtype :', this.searchType)
         try {
            this.setLoading(true);
            
            // Create new abort controller for this request
            this.abortController = new AbortController();
            
            let apiUrl;

            if (this.searchType === 'country') {
                apiUrl = `${this.apiEndpoint}?text=${encodeURIComponent(query)}`;
            }

            else if (this.searchType === 'province' && this.countryCode) {
                console.log('country code :', this.countryCode)
                console.log('api endpoint :', this.provinceApiEndpoint)
       
                // Search for provinces/states within a specific country
                apiUrl = `${this.provinceApiEndpoint}?text=${encodeURIComponent(query)}&countrycode=${encodeURIComponent(this.countryCode)}`;
                console.log('api url :', apiUrl)
                // } else if (this.searchType === 'city' && this.countryCode) {
            //     // Search for cities within a specific country/province
            //     let cityParams = `country_code=${encodeURIComponent(this.countryCode)}&text=${encodeURIComponent(query)}`;
            //     if (this.provinceCode) {
            //         cityParams += `&province_code=${encodeURIComponent(this.provinceCode)}`;
            //     }
            //     apiUrl = `${this.provinceApiEndpoint}?${cityParams}`;
            } else {
                // Default country search
                apiUrl = `${this.apiEndpoint}?text=${encodeURIComponent(query)}`;
            }
            
            const response = await fetch(apiUrl, { 
                signal: this.abortController.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.handleSearchResults(data, query);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                // Request was cancelled, ignore
                return;
            }
            
            console.error('Search error:', error);
            this.handleSearchError(error);
            this.onError(error);
        } finally {
            this.setLoading(false);
        }
    }
    
    handleSearchResults(data, query) {
        // Ensure we're still showing results for the current query
        if (query !== this.currentQuery) return;
        
        this.currentResults = [];
        
        if (data.features && data.features.length > 0) {
            // Process and filter results
            this.currentResults = data.features
                .slice(0, this.maxResults)
                .map(feature => {
                    if (this.searchType === 'city') {
                        return {
                            formatted: feature.properties.formatted || feature.properties.name,
                            city: feature.properties.city || feature.properties.name,
                            province: feature.properties.state || feature.properties.province,
                            country: feature.properties.country_name || feature.properties.country,
                            countryCode: feature.properties.country_code || this.countryCode,
                            provinceCode: feature.properties.state_code || feature.properties.province_code || this.provinceCode,
                            lat: feature.properties.lat,
                            lon: feature.properties.lon,
                            properties: feature.properties
                        };
                    } else if (this.searchType === 'province') {
                        return {
                            formatted: feature.properties.formatted || feature.properties.name,
                            province: feature.properties.state || feature.properties.province || feature.properties.name,
                            country: feature.properties.country_name || feature.properties.country,
                            countryCode: feature.properties.country_code || this.countryCode,
                            provinceCode: feature.properties.state_code || feature.properties.province_code,
                            lat: feature.properties.lat,
                            lon: feature.properties.lon,
                            properties: feature.properties
                        };
                    } else {
                        return {
                            formatted: feature.properties.formatted,
                            country: feature.properties.country_name || feature.properties.country || 'Unknown',
                            countryCode: feature.properties.country_code || feature.properties.country,
                            lat: feature.properties.lat,
                            lon: feature.properties.lon,
                            properties: feature.properties
                        };
                    }
                });
            
            this.renderResults();
        } else {
            this.showNoResults();
        }
    }
    
    handleSearchError(error) {
        this.listElement.innerHTML = `
            <div class="autocomplete-error">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Failed to load results. Please try again.
            </div>
        `;
        this.showList();
    }
    
    renderResults() {
        if (this.currentResults.length === 0) {
            this.showNoResults();
            return;
        }
        
        this.listElement.innerHTML = '';
        this.selectedIndex = -1;
        
        this.currentResults.forEach((result, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.dataset.index = index;
            
            let displayText = this.highlightMatch(result.formatted, this.currentQuery);
            let subText = '';
            
            if (this.searchType === 'city') {
                subText = result.province && result.country ? `${result.province}, ${result.country}` : 
                         result.country ? `${result.country}` : '';
            } else if (this.searchType === 'province') {
                subText = result.country ? `${result.country}` : '';
            } else {
                subText = result.country ? `${result.country}` : '';
            }
            
            item.innerHTML = `
                <div>
                    <div class="autocomplete-item-text">${displayText}</div>
                    ${subText ? `<small class="autocomplete-item-country">${subText}</small>` : ''}
                </div>
                <i class="fas fa-${this.searchType === 'city' ? 'city' : this.searchType === 'province' ? 'map' : 'map-marker-alt'} text-muted"></i>
            `;
            
            item.addEventListener('click', () => this.selectItem(index));
            item.addEventListener('mouseenter', () => this.highlightItem(index));
            
            this.listElement.appendChild(item);
        });
        
        this.showList();
    }
    
    highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }
    
    showNoResults() {
        const searchTerm = this.searchType === 'city' ? 'cities' : 
                          this.searchType === 'province' ? 'provinces' : 'countries';
        this.listElement.innerHTML = `
            <div class="autocomplete-no-results">
                <i class="fas fa-search me-2"></i>
                No ${searchTerm} found for "${this.currentQuery}"
            </div>
        `;
        this.showList();
    }
    
    navigateDown() {
        if (this.selectedIndex < this.currentResults.length - 1) {
            this.highlightItem(this.selectedIndex + 1);
        }
    }
    
    navigateUp() {
        if (this.selectedIndex > 0) {
            this.highlightItem(this.selectedIndex - 1);
        } else if (this.selectedIndex === 0) {
            this.highlightItem(-1);
        }
    }
    
    highlightItem(index) {
        // Remove previous highlights
        this.listElement.querySelectorAll('.autocomplete-item').forEach(item => {
            item.classList.remove('highlighted', 'keyboard-focus');
        });
        
        this.selectedIndex = index;
        
        if (index >= 0 && index < this.currentResults.length) {
            const item = this.listElement.querySelector(`[data-index="${index}"]`);
            if (item) {
                item.classList.add('highlighted', 'keyboard-focus');
                item.scrollIntoView({ block: 'nearest' });
            }
        }
    }
    
    selectCurrentItem() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.currentResults.length) {
            this.selectItem(this.selectedIndex);
        }
    }
    
    selectItem(index) {
        if (index < 0 || index >= this.currentResults.length) return;
        
        const selectedResult = this.currentResults[index];
        this.inputElement.value = selectedResult.formatted;
        this.hideList();
        
        // Trigger selection callback
        this.onSelect(selectedResult);
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        this.inputElement.dispatchEvent(event);
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        
        if (loading) {
            this.loadingElement.classList.add('show');
            this.searchIcon.style.display = 'none';
        } else {
            this.loadingElement.classList.remove('show');
            this.searchIcon.style.display = 'block';
        }
    }
    
    showList() {
        this.listElement.classList.add('show');
    }
    
    hideList() {
        this.listElement.classList.remove('show');
        this.selectedIndex = -1;
    }
    
    isListVisible() {
        return this.listElement.classList.contains('show');
    }
    
    // Public methods
    clear() {
        this.inputElement.value = '';
        this.currentQuery = '';
        this.currentResults = [];
        this.hideList();
        this.setLoading(false);
    }
    
    setValue(value) {
        this.inputElement.value = value;
        this.currentQuery = value;
    }
    
    setCountryCode(countryCode) {
        this.countryCode = countryCode;
        // Clear results when country changes
        this.clear();
    }
    
    setProvinceCode(provinceCode) {
        this.provinceCode = provinceCode;
        // Clear results when province changes
        this.clear();
    }
    
    setSearchType(type) {
        this.searchType = type;
        // Update placeholder based on search type
        if (type === 'city') {
            this.inputElement.placeholder = 'Start typing to search cities...';
        } else if (type === 'province') {
            this.inputElement.placeholder = 'Start typing to search provinces...';
        } else {
            this.inputElement.placeholder = 'Start typing to search countries...';
        }
        this.clear();
    }
    
    enable() {
        this.inputElement.disabled = false;
        this.inputElement.classList.remove('disabled');
    }
    
    disable() {
        this.inputElement.disabled = true;
        this.inputElement.classList.add('disabled');
        this.clear();
    }
    
    destroy() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        if (this.abortController) {
            this.abortController.abort();
        }
        
        // Remove event listeners
        document.removeEventListener('click', this.handleDocumentClick);
        
        // Remove the wrapper and restore original input
        if (this.container && this.container.parentNode) {
            this.container.parentNode.insertBefore(this.inputElement, this.container);
            this.container.remove();
        }
    }
}

// Export for use in other files
window.CountryAutocomplete = CountryAutocomplete;