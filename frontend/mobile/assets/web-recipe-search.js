/**
 * Web Recipe Search Module
 * Handles recipe search from TheMealDB and AI-powered ingredient mapping
 */

(function() {
    'use strict';

    // State management
    let currentRecipe = null;
    let searchResults = [];
    let ingredientMappings = [];

    // API endpoints (use existing ChefCode API)
    const API_BASE = window.CHEFCODE_CONFIG?.API_URL || 'http://localhost:8000';
    const API_KEY = window.CHEFCODE_CONFIG?.API_KEY || '';

    // DOM Elements
    const modal = document.getElementById('web-recipe-modal');
    const searchBtn = document.getElementById('search-web-recipe-btn');
    const closeBtn = document.getElementById('web-recipe-close-btn');
    const searchInput = document.getElementById('web-recipe-search-input');
    const searchButton = document.getElementById('web-recipe-search-btn');
    
    // Screens
    const searchScreen = document.getElementById('web-recipe-search-screen');
    const detailScreen = document.getElementById('web-recipe-detail-screen');
    const mappingScreen = document.getElementById('web-recipe-mapping-screen');
    const successScreen = document.getElementById('web-recipe-success-screen');
    
    // Screen elements
    const loadingElement = document.getElementById('web-recipe-loading');
    const resultsContainer = document.getElementById('web-recipe-results-container');
    const emptyState = document.getElementById('web-recipe-empty');
    const detailContent = document.getElementById('web-recipe-detail-content');
    const mappingList = document.getElementById('web-recipe-mapping-list');
    const mappingLoading = document.getElementById('web-recipe-mapping-loading');
    const mappingResults = document.getElementById('web-recipe-mapping-results');

    // Initialize
    function init() {
        attachEventListeners();
        console.log('✅ Web Recipe Search module initialized');
    }

    // Event Listeners
    function attachEventListeners() {
        // Open modal
        if (searchBtn) {
            searchBtn.addEventListener('click', openModal);
        }

        // Close modal
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        // Close on overlay click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });
        }

        // Search functionality
        if (searchButton) {
            searchButton.addEventListener('click', performSearch);
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
        }

        // Back buttons
        const detailBackBtn = document.getElementById('web-recipe-detail-back');
        if (detailBackBtn) {
            detailBackBtn.addEventListener('click', () => showScreen('search'));
        }

        const mappingBackBtn = document.getElementById('web-recipe-mapping-back');
        if (mappingBackBtn) {
            mappingBackBtn.addEventListener('click', () => showScreen('detail'));
        }

        // Import button
        const importBtn = document.getElementById('web-recipe-import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', startImportProcess);
        }

        // Mapping actions
        const mappingCancelBtn = document.getElementById('web-recipe-mapping-cancel');
        if (mappingCancelBtn) {
            mappingCancelBtn.addEventListener('click', () => showScreen('detail'));
        }

        const mappingConfirmBtn = document.getElementById('web-recipe-mapping-confirm');
        if (mappingConfirmBtn) {
            mappingConfirmBtn.addEventListener('click', saveRecipe);
        }

        // Success close
        const successCloseBtn = document.getElementById('web-recipe-success-close');
        if (successCloseBtn) {
            successCloseBtn.addEventListener('click', closeModal);
        }
    }

    // Modal Management
    function openModal() {
        if (modal) {
            modal.style.display = 'flex';
            showScreen('search');
            if (searchInput) {
                searchInput.focus();
            }
        }
    }

    function closeModal() {
        if (modal) {
            modal.style.display = 'none';
            resetModal();
        }
    }

    function resetModal() {
        currentRecipe = null;
        searchResults = [];
        ingredientMappings = [];
        if (searchInput) searchInput.value = '';
        if (resultsContainer) resultsContainer.innerHTML = '';
        showScreen('search');
    }

    function showScreen(screenName) {
        console.log('Switching to screen:', screenName);
        
        // Hide all screens
        [searchScreen, detailScreen, mappingScreen, successScreen].forEach(screen => {
            if (screen) screen.classList.remove('active');
        });

        // Show requested screen
        switch(screenName) {
            case 'search':
                if (searchScreen) {
                    searchScreen.classList.add('active');
                    console.log('Search screen activated');
                }
                break;
            case 'detail':
                if (detailScreen) {
                    detailScreen.classList.add('active');
                    console.log('Detail screen activated');
                } else {
                    console.error('Detail screen element not found!');
                }
                break;
            case 'mapping':
                if (mappingScreen) {
                    mappingScreen.classList.add('active');
                    console.log('Mapping screen activated');
                }
                break;
            case 'success':
                if (successScreen) {
                    successScreen.classList.add('active');
                    console.log('Success screen activated');
                }
                break;
        }
    }

    // Search Functionality
    async function performSearch() {
        const query = searchInput?.value.trim();
        if (!query) {
            alert('Please enter a search term');
            return;
        }

        try {
            // Show loading
            if (loadingElement) loadingElement.style.display = 'flex';
            if (resultsContainer) resultsContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';

            // Call backend to search recipes
            console.log('🔗 API Call: search_recipes →', `${API_BASE}/api/web-recipes/search_recipes`);
            const response = await fetch(`${API_BASE}/api/web-recipes/search_recipes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                body: JSON.stringify({
                    query: query,
                    cuisine: null,
                    restrictions: []
                })
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const recipes = await response.json();
            searchResults = recipes;

            // Hide loading
            if (loadingElement) loadingElement.style.display = 'none';

            // Display results or empty state
            if (recipes && recipes.length > 0) {
                displaySearchResults(recipes);
            } else {
                if (emptyState) emptyState.style.display = 'block';
            }

        } catch (error) {
            console.error('Search error:', error);
            if (loadingElement) loadingElement.style.display = 'none';
            alert('Failed to search recipes. Please try again.');
        }
    }

    function displaySearchResults(recipes) {
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'grid';

        recipes.forEach(recipe => {
            const card = createRecipeCard(recipe);
            resultsContainer.appendChild(card);
        });
    }

    function createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'web-recipe-card';
        card.onclick = () => {
            console.log('Recipe card clicked:', recipe.name);
            showRecipeDetail(recipe);
        };

        const imageUrl = recipe.image || '';
        const category = recipe.category || 'Other';
        const cuisine = recipe.area || 'International';
        const ingredientCount = recipe.ingredients?.length || 0;

        card.innerHTML = `
            <img src="${imageUrl}" alt="${recipe.name}" class="web-recipe-card-image" 
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'400\\' height=\\'200\\'%3E%3Crect fill=\\'%23667eea\\' width=\\'400\\' height=\\'200\\'/%3E%3Ctext fill=\\'white\\' x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\' font-size=\\'24\\' font-family=\\'Arial\\'%3E${recipe.name}%3C/text%3E%3C/svg%3E'">
            <div class="web-recipe-card-content">
                <h3 class="web-recipe-card-title">${recipe.name}</h3>
                <div class="web-recipe-card-meta">
                    <span class="web-recipe-card-badge">
                        <i class="fas fa-utensils"></i> ${category}
                    </span>
                    <span class="web-recipe-card-badge">
                        <i class="fas fa-globe"></i> ${cuisine}
                    </span>
                </div>
                <p style="color: #666; font-size: 0.95em; margin-top: 8px;">
                    <i class="fas fa-list"></i> ${ingredientCount} ingredients
                </p>
            </div>
        `;

        return card;
    }

    function showRecipeDetail(recipe) {
        console.log('showRecipeDetail called for:', recipe.name);
        currentRecipe = recipe;
        
        if (!detailContent) {
            console.error('detailContent element not found!');
            return;
        }

        const imageUrl = recipe.image || '';
        const category = recipe.category || 'Other';
        const cuisine = recipe.area || 'International';
        
        let ingredientsHTML = '<ul class="web-recipe-ingredients-list">';
        recipe.ingredients.forEach(ing => {
            ingredientsHTML += `
                <li>
                    <i class="fas fa-check-circle"></i>
                    <span><strong>${ing.name}</strong> ${ing.measure ? '- ' + ing.measure : ''}</span>
                </li>
            `;
        });
        ingredientsHTML += '</ul>';

        detailContent.innerHTML = `
            <img src="${imageUrl}" alt="${recipe.name}" class="web-recipe-detail-image"
                 onerror="this.style.display='none'">
            <h2 class="web-recipe-detail-title">${recipe.name}</h2>
            <div class="web-recipe-detail-meta">
                <span class="web-recipe-card-badge" style="font-size: 1em;">
                    <i class="fas fa-utensils"></i> ${category}
                </span>
                <span class="web-recipe-card-badge" style="font-size: 1em;">
                    <i class="fas fa-globe"></i> ${cuisine}
                </span>
                <span class="web-recipe-card-badge" style="font-size: 1em;">
                    <i class="fas fa-list"></i> ${recipe.ingredients.length} ingredients
                </span>
            </div>
            <div class="web-recipe-detail-section">
                <h4><i class="fas fa-carrot"></i> Ingredients</h4>
                ${ingredientsHTML}
            </div>
            <div class="web-recipe-detail-section">
                <h4><i class="fas fa-clipboard-list"></i> Instructions</h4>
                <div class="web-recipe-instructions">${recipe.instructions || 'No instructions available.'}</div>
            </div>
        `;

        showScreen('detail');
    }

    // Import Process
    async function startImportProcess() {
        console.log('=== Starting Import Process ===');
        
        if (!currentRecipe) {
            console.error('No current recipe!');
            return;
        }

        console.log('Current recipe:', currentRecipe);
        showScreen('mapping');
        
        if (mappingLoading) mappingLoading.style.display = 'flex';
        if (mappingResults) mappingResults.style.display = 'none';

        try {
            // Prepare ingredients for mapping
            const recipeIngredients = currentRecipe.ingredients.map(ing => ({
                name: ing.name,
                quantity: ing.measure.split(' ')[0] || '1',
                unit: ing.measure.split(' ').slice(1).join(' ') || 'pz'
            }));
            
            console.log('Prepared ingredients:', recipeIngredients);
            console.log('API URL:', `${API_BASE}/api/web-recipes/map_ingredients`);
            console.log('API Key present:', !!API_KEY);

            // Call backend to map ingredients
            const response = await fetch(`${API_BASE}/api/web-recipes/map_ingredients`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                body: JSON.stringify({
                    recipe_id: currentRecipe.id,
                    recipe_ingredients: recipeIngredients
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Response Error:', response.status, errorText);
                throw new Error(`Ingredient mapping failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('Mapping result:', result);
            
            if (!result.mappings || !Array.isArray(result.mappings)) {
                console.error('Invalid mappings format:', result);
                throw new Error('Invalid response format from server');
            }
            
            ingredientMappings = result.mappings;

            // Display mappings
            displayIngredientMappings(result.mappings);

            if (mappingLoading) mappingLoading.style.display = 'none';
            if (mappingResults) mappingResults.style.display = 'block';

        } catch (error) {
            console.error('Mapping error details:', error);
            console.error('Error stack:', error.stack);
            alert(`Failed to map ingredients: ${error.message}\n\nCheck console for details.`);
            showScreen('detail');
        }
    }

    function displayIngredientMappings(mappings) {
        if (!mappingList) return;

        mappingList.innerHTML = '';

        mappings.forEach(mapping => {
            const item = createMappingItem(mapping);
            mappingList.appendChild(item);
        });
    }

    function createMappingItem(mapping) {
        const div = document.createElement('div');
        const matchType = mapping.match_type || 'missing';
        
        div.className = `web-recipe-mapping-item ${matchType}`;

        let badgeIcon = '';
        let mappedText = '';

        switch(matchType) {
            case 'exact':
                badgeIcon = '✅';
                mappedText = `Matched to: <strong>${mapping.mapped_to}</strong>`;
                break;
            case 'substitute':
                badgeIcon = '🔄';
                mappedText = `Substitute: <strong>${mapping.mapped_to}</strong>`;
                break;
            case 'missing':
                badgeIcon = '❌';
                mappedText = '<span style="color: #ef4444;">Not in inventory</span>';
                break;
        }

        div.innerHTML = `
            <div class="mapping-item-badge ${matchType}">${badgeIcon}</div>
            <div class="mapping-item-content">
                <div class="mapping-item-recipe">
                    ${mapping.recipe_ingredient} 
                    <span style="font-weight: normal; color: #999;">
                        (${mapping.recipe_quantity} ${mapping.recipe_unit})
                    </span>
                </div>
                <div class="mapping-item-inventory">${mappedText}</div>
                ${mapping.note ? `<div class="mapping-item-note">${mapping.note}</div>` : ''}
            </div>
        `;

        return div;
    }

    // Save Recipe
    async function saveRecipe() {
        if (!currentRecipe || !ingredientMappings) return;

        try {
            // Prepare data for saving
            const saveData = {
                recipe_id: currentRecipe.id,
                name: currentRecipe.name,
                instructions: currentRecipe.instructions || '',
                cuisine: currentRecipe.area || null,
                image_url: currentRecipe.image || null,
                source_url: currentRecipe.source_url || `https://www.themealdb.com/meal/${currentRecipe.id}`,
                ingredients_raw: currentRecipe.ingredients,
                ingredients_mapped: ingredientMappings
            };

            // Call backend to save recipe
            const response = await fetch(`${API_BASE}/api/web-recipes/save_recipe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                body: JSON.stringify(saveData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to save recipe');
            }

            const result = await response.json();
            console.log('✅ Recipe saved:', result);

            // Show success screen
            showScreen('success');

            // Refresh recipe catalogue if on that page
            if (typeof loadRecipeCatalogue === 'function') {
                setTimeout(() => {
                    loadRecipeCatalogue();
                }, 1000);
            }

        } catch (error) {
            console.error('Save error:', error);
            alert(error.message || 'Failed to save recipe. Please try again.');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API for external modules (like AI Assistant)
    window.WEB_RECIPE_SEARCH = {
        openModal: openModal,
        closeModal: closeModal,
        searchWithQuery: function(query) {
            openModal();
            if (searchInput) {
                searchInput.value = query;
                // Trigger search automatically
                setTimeout(() => performSearch(), 300);
            }
        }
    };

})();

