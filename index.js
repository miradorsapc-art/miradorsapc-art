const STORAGE_KEYS = {
  cart: 'globe-beauty-cart',
  favorites: 'globe-beauty-favorites',
  account: 'globe-beauty-account',
  newsletter: 'globe-beauty-newsletter'
};

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Storage non disponible :', error);
  }
}

let cart = readStorage(STORAGE_KEYS.cart, []);
const favorites = new Set(readStorage(STORAGE_KEYS.favorites, []));
const defaultArticles = [
  {
    title: 'Comment porter la robe dorée avec finesse',
    category: 'Beauty notes',
    excerpt: 'Les matières brillantes, les accessoires sobres et la bonne coupe permettent d’obtenir un look chic, léger et mémorable.',
    image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
    video: ''
  },
  {
    title: 'Les accessoires qui sublimisent une tenue de soirée',
    category: 'Style guide',
    excerpt: 'Un bijou discret, une pochette élégante et des chaussures impeccables suffisent à transformer une tenue en moment fort.',
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80',
    video: ''
  },
  {
    title: 'Une vision du luxe moderne et minimaliste',
    category: 'Maison',
    excerpt: 'Le luxe discret repose sur l’équilibre entre l’essential, les textures nobles et un sens aigu de la présence.',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    video: ''
  }
];
const articlesStorageKey = 'globe-beauty-articles';
const articlePosts = readStorage(articlesStorageKey, defaultArticles);

const cartPanel = document.getElementById('cartPanel');
const detailPanel = document.getElementById('detailPanel');
const accountPanel = document.getElementById('accountPanel');
const cartOverlay = document.getElementById('cartOverlay');
const cartItemsContainer = document.getElementById('cartItems');
const cartBadge = document.getElementById('cartBadge');
const favoriteCount = document.getElementById('favoriteCount');
const subtotalElement = document.getElementById('subtotal');
const shippingElement = document.getElementById('shipping');
const totalElement = document.getElementById('total');
const checkoutForm = document.getElementById('checkoutForm');
const accountForm = document.querySelector('.account-form');
const productSearch = document.getElementById('productSearch');
const filterButtons = document.querySelectorAll('.filter-btn');
const articleForm = document.getElementById('articleForm');
const journalGrid = document.getElementById('journalGrid');
const checkoutSteps = document.querySelectorAll('.checkout-step');
const checkoutPanels = document.querySelectorAll('.checkout-step-panel');
const checkoutPrev = document.querySelector('.checkout-prev');
const checkoutNext = document.querySelector('.checkout-next');
const checkoutSubmit = document.querySelector('.checkout-btn');
const detailTitle = document.getElementById('detailTitle');
const detailPrice = document.getElementById('detailPrice');
const detailDescription = document.getElementById('detailDescription');
const detailMaterial = document.getElementById('detailMaterial');
const detailColor = document.getElementById('detailColor');
const detailImage = document.getElementById('detailImage');
const detailBadge = document.getElementById('detailBadge');
const detailQuantity = document.getElementById('detailQuantity');
const detailAddToCart = document.getElementById('detailAddToCart');
const successToast = document.getElementById('successToast');
const API_URL = 'http://localhost:3000';

async function apiRequest(endpoint, payload = null) {
  const options = {
    method: payload ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (payload) {
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erreur serveur');
  }

  return data;
}

const shippingFee = 12;
let activeDetailProduct = null;
let detailQty = 1;
let currentState = 'empty';
let activeFilter = 'all';

function showToast(message) {
  if (!successToast) return;

  successToast.textContent = message;
  successToast.classList.add('visible');

  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    successToast.classList.remove('visible');
  }, 2200);
}

function setSiteState(state) {
  currentState = state;

  if (state === 'empty') {
    cartPanel.classList.remove('open');
    detailPanel.classList.remove('open');
    accountPanel.classList.remove('open');
    successToast.classList.remove('visible');
    cartItemsContainer.innerHTML = '<div class="empty-cart">Votre panier est vide.</div>';
    calculateTotals();
    syncOverlayState();
    return;
  }

  if (state === 'cart') {
    if (!cart.length) {
      setSiteState('empty');
      return;
    }

    cartPanel.classList.add('open');
    detailPanel.classList.remove('open');
    accountPanel.classList.remove('open');
    successToast.classList.remove('visible');
    syncOverlayState();
    return;
  }

  if (state === 'detail') {
    cartPanel.classList.remove('open');
    detailPanel.classList.add('open');
    accountPanel.classList.remove('open');
    successToast.classList.remove('visible');
    syncOverlayState();
    return;
  }

  if (state === 'success') {
    cartPanel.classList.remove('open');
    detailPanel.classList.remove('open');
    accountPanel.classList.remove('open');
    successToast.classList.add('visible');
    syncOverlayState();
    setTimeout(() => successToast.classList.remove('visible'), 2200);
  }
}

function updateFavoriteCount() {
  if (favoriteCount) {
    favoriteCount.textContent = String(favorites.size);
  }
}

function syncFavoriteButtons() {
  document.querySelectorAll('.favorite-toggle').forEach((button) => {
    const card = button.closest('.product-card');
    const name = card?.dataset.name;
    const isFavorite = name && favorites.has(name);
    button.classList.toggle('active', isFavorite);
    button.textContent = isFavorite ? '♥' : '♡';
  });
}

function saveCartState() {
  writeStorage(STORAGE_KEYS.cart, cart);
}

function saveFavoriteState() {
  writeStorage(STORAGE_KEYS.favorites, [...favorites]);
  updateFavoriteCount();
}

function syncOverlayState() {
  const isOverlayVisible = cartPanel.classList.contains('open') || detailPanel.classList.contains('open') || accountPanel.classList.contains('open');
  cartOverlay.classList.toggle('visible', isOverlayVisible);
}

function updateAccountStatus() {
  const accountStatus = document.getElementById('accountStatus');
  const storedAccount = readStorage(STORAGE_KEYS.account, { email: '', connected: false });

  if (!accountStatus) return;

  if (storedAccount.connected && storedAccount.email) {
    accountStatus.textContent = `Connecté : ${storedAccount.email}`;
    return;
  }

  accountStatus.textContent = 'Aucun compte connecté.';
}

function applyProductFilters() {
  const query = productSearch.value.trim().toLowerCase();

  document.querySelectorAll('.product-card').forEach((card) => {
    const categoryMatch = activeFilter === 'all' || card.dataset.category === activeFilter;
    const searchMatch = !query || card.dataset.name.toLowerCase().includes(query);
    card.style.display = categoryMatch && searchMatch ? '' : 'none';
  });
}

let checkoutStep = 1;

function renderArticles() {
  if (!journalGrid) return;

  const articles = [...articlePosts];

  journalGrid.innerHTML = articles
    .map(
      (article, index) => {
        const mediaHtml = article.video
          ? `<video controls preload="metadata" class="journal-media"><source src="${article.video}" /></video>`
          : article.image
            ? `<img class="journal-media" src="${article.image}" alt="${article.title}" />`
            : '';

        return `
          <article class="journal-card ${index === 0 ? 'highlight' : ''}" style="${article.image && !article.video ? `background-image: linear-gradient(180deg, rgba(7, 7, 7, 0.15), rgba(7, 7, 7, 0.8)), url('${article.image}');` : ''}">
            ${mediaHtml}
            <div class="journal-content">
              <p>${article.category}</p>
              <h3>${article.title}</h3>
              <p class="journal-excerpt">${article.excerpt}</p>
            </div>
          </article>
        `;
      }
    )
    .join('');
}

function updateCheckoutStepDisplay() {
  checkoutPanels.forEach((panel) => {
    const isActive = Number(panel.dataset.stepPanel) === checkoutStep;
    panel.classList.toggle('active', isActive);
  });

  checkoutSteps.forEach((step, index) => {
    const active = index + 1 === checkoutStep;
    step.classList.toggle('active', active);
  });

  const isFirstStep = checkoutStep === 1;
  const isLastStep = checkoutStep === 4;

  checkoutPrev?.classList.toggle('hidden', isFirstStep);
  checkoutNext?.classList.toggle('hidden', !isFirstStep || isLastStep);
  checkoutSubmit?.classList.toggle('hidden', !isLastStep);

  document.getElementById('confirmDelivery').textContent = document.getElementById('deliveryMode')?.value === 'express' ? 'Express' : document.getElementById('deliveryMode')?.value === 'pickup' ? 'Retrait boutique' : 'Standard';
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'carte';
  const paymentLabel = {
    carte: 'Carte bancaire',
    orange: 'Orange Money',
    airtel: 'Airtel Money',
    mpsa: 'MPSA',
    cash: 'Paiement à la livraison'
  }[paymentMethod] || 'Carte bancaire';
  document.getElementById('confirmPayment').textContent = paymentLabel;
  document.getElementById('confirmTotal').textContent = totalElement.textContent;
}

function formatPrice(value) {
  return `${value.toFixed(2)} $`;
}

function calculateTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = cart.length ? shippingFee : 0;
  const total = subtotal + shipping;

  subtotalElement.textContent = formatPrice(subtotal);
  shippingElement.textContent = formatPrice(shipping);
  totalElement.textContent = formatPrice(total);
  cartBadge.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
}

function renderCart() {
  if (!cart.length) {
    cartItemsContainer.innerHTML = '<div class="empty-cart">Votre panier est vide.</div>';
    calculateTotals();
    if (currentState !== 'success') {
      setSiteState('empty');
    }
    return;
  }

  cartItemsContainer.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" />
          <div>
            <h4>${item.name}</h4>
            <p>${formatPrice(item.price)}</p>
            <div class="item-actions">
              <button class="qty-btn" data-action="decrease" data-name="${item.name}">-</button>
              <span>${item.quantity}</span>
              <button class="qty-btn" data-action="increase" data-name="${item.name}">+</button>
            </div>
          </div>
          <button class="remove-item" data-action="remove" data-name="${item.name}">Suppr.</button>
        </div>
      `
    )
    .join('');

  calculateTotals();
}

function addToCart(name, price, image, quantity = 1) {
  const existingItem = cart.find((item) => item.name === name);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ name, price, image, quantity });
  }

  saveCartState();
  renderCart();
  if (cart.length) {
    setSiteState('cart');
  } else {
    setSiteState('empty');
  }
}

function updateQuantity(name, action) {
  const item = cart.find((entry) => entry.name === name);

  if (!item) return;

  if (action === 'increase') {
    item.quantity += 1;
  }

  if (action === 'decrease') {
    item.quantity -= 1;
  }

  if (item.quantity <= 0) {
    const index = cart.findIndex((entry) => entry.name === name);
    cart.splice(index, 1);
  }

  saveCartState();
  renderCart();
  if (cart.length) {
    setSiteState('cart');
  } else {
    setSiteState('empty');
  }
}

function removeItem(name) {
  const index = cart.findIndex((item) => item.name === name);
  if (index !== -1) {
    cart.splice(index, 1);
  }
  saveCartState();
  renderCart();
  if (cart.length) {
    setSiteState('cart');
  } else {
    setSiteState('empty');
  }
}

function openCart() {
  if (!cart.length) {
    setSiteState('empty');
    return;
  }

  cartPanel.classList.add('open');
  detailPanel.classList.remove('open');
  accountPanel.classList.remove('open');
  currentState = 'cart';
  syncOverlayState();
}

function closeCart() {
  cartPanel.classList.remove('open');
  if (!detailPanel.classList.contains('open') && !accountPanel.classList.contains('open')) {
    currentState = 'empty';
  }
  syncOverlayState();
}

function openAccountPanel() {
  cartPanel.classList.remove('open');
  detailPanel.classList.remove('open');
  accountPanel.classList.add('open');
  currentState = 'account';
  syncOverlayState();
}

function closeAccountPanel() {
  accountPanel.classList.remove('open');
  if (!cartPanel.classList.contains('open') && !detailPanel.classList.contains('open')) {
    currentState = 'empty';
  }
  syncOverlayState();
}

function openDetail(productCard) {
  const product = {
    name: productCard.dataset.name,
    price: Number(productCard.dataset.price),
    image: productCard.dataset.image,
    description: productCard.dataset.description,
    material: productCard.dataset.material,
    color: productCard.dataset.color,
    badge: productCard.querySelector('.tag')?.textContent || 'Signature'
  };

  activeDetailProduct = product;
  detailQty = 1;

  detailTitle.textContent = product.name;
  detailPrice.textContent = formatPrice(product.price);
  detailDescription.textContent = product.description;
  detailMaterial.textContent = product.material;
  detailColor.textContent = product.color;
  detailImage.src = product.image;
  detailImage.alt = product.name;
  detailBadge.textContent = product.badge;
  detailQuantity.textContent = String(detailQty);

  cartPanel.classList.remove('open');
  accountPanel.classList.remove('open');
  detailPanel.classList.add('open');
  currentState = 'detail';
  syncOverlayState();
}

function closeDetail() {
  detailPanel.classList.remove('open');
  if (cart.length) {
    cartPanel.classList.add('open');
    currentState = 'cart';
  } else if (!accountPanel.classList.contains('open')) {
    currentState = 'empty';
  }
  syncOverlayState();
}

function toggleOverlay() {
  syncOverlayState();
}

const addButtons = document.querySelectorAll('.add-to-cart');
addButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const card = button.closest('.product-card');
    const name = card.dataset.name;
    const price = Number(card.dataset.price);
    const image = card.dataset.image;
    addToCart(name, price, image);
  });
});

const favoriteButtons = document.querySelectorAll('.favorite-toggle');
favoriteButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const card = button.closest('.product-card');
    const name = card.dataset.name;

    if (favorites.has(name)) {
      favorites.delete(name);
      button.classList.remove('active');
      button.textContent = '♡';
    } else {
      favorites.add(name);
      button.classList.add('active');
      button.textContent = '♥';
    }

    saveFavoriteState();
    syncFavoriteButtons();
  });
});

const viewDetailButtons = document.querySelectorAll('.view-detail');
viewDetailButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const card = button.closest('.product-card');
    openDetail(card);
  });
});

const productCards = document.querySelectorAll('.product-card');
productCards.forEach((card) => {
  card.addEventListener('click', (event) => {
    if (event.target.closest('.add-to-cart') || event.target.closest('.view-detail') || event.target.closest('.favorite-toggle')) {
      return;
    }
    openDetail(card);
  });
});

const cartToggle = document.querySelector('.cart-toggle');
if (cartToggle) {
  cartToggle.addEventListener('click', openCart);
}

document.querySelector('.search-toggle').addEventListener('click', () => productSearch.focus());
document.querySelector('.wishlist-toggle').addEventListener('click', openAccountPanel);
document.querySelector('.account-toggle').addEventListener('click', openAccountPanel);
document.querySelector('.close-cart').addEventListener('click', closeCart);
document.querySelector('.close-detail').addEventListener('click', closeDetail);
document.querySelector('.close-account').addEventListener('click', closeAccountPanel);
document.querySelector('.secondary-action').addEventListener('click', openAccountPanel);
cartOverlay.addEventListener('click', () => {
  closeCart();
  closeDetail();
  closeAccountPanel();
  toggleOverlay();
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    applyProductFilters();
  });
});

if (productSearch) {
  productSearch.addEventListener('input', applyProductFilters);
}

cartItemsContainer.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const action = target.dataset.action;
  const name = target.dataset.name;

  if (!action || !name) return;

  if (action === 'increase' || action === 'decrease') {
    updateQuantity(name, action);
  }

  if (action === 'remove') {
    removeItem(name);
  }
});

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!cart.length) {
    alert('Votre panier est vide. Ajoutez au moins un article avant de commander.');
    return;
  }

  if (checkoutStep < 4) {
    checkoutStep += 1;
    updateCheckoutStepDisplay();
    return;
  }

  const customerName = document.getElementById('customerName').value.trim();
  const customerEmail = document.getElementById('customerEmail').value.trim();
  const customerAddress = document.getElementById('customerAddress').value.trim();
  const deliveryCity = document.getElementById('deliveryCity').value.trim();
  const deliveryMode = document.getElementById('deliveryMode').value;
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'carte';

  if (!customerName || !customerEmail || !customerAddress || !deliveryCity) {
    alert('Veuillez remplir tous les champs du formulaire avant de valider.');
    return;
  }

  try {
    const response = await apiRequest('/api/checkout', {
      customerName,
      customerEmail,
      customerAddress,
      deliveryCity,
      deliveryMode,
      paymentMethod,
      items: cart
    });

    cart.length = 0;
    saveCartState();
    checkoutForm.reset();
    checkoutStep = 1;
    renderCart();
    updateCheckoutStepDisplay();
    setSiteState('success');
    showToast(response.message || 'Commande enregistrée avec succès !');

    setTimeout(() => {
      setSiteState('empty');
    }, 2300);
  } catch (error) {
    alert(error.message || 'La commande n’a pas pu être enregistrée.');
  }
});

checkoutNext?.addEventListener('click', () => {
  const currentPanel = document.querySelector('.checkout-step-panel.active');
  const stepNumber = Number(currentPanel?.dataset.stepPanel || 1);

  if (stepNumber === 1 && !document.getElementById('customerName').value.trim()) {
    alert('Veuillez renseigner votre nom avant de continuer.');
    return;
  }

  if (stepNumber === 2 && !document.getElementById('deliveryCity').value.trim()) {
    alert('Veuillez renseigner votre ville avant de continuer.');
    return;
  }

  checkoutStep = Math.min(4, stepNumber + 1);
  updateCheckoutStepDisplay();
});

checkoutPrev?.addEventListener('click', () => {
  checkoutStep = Math.max(1, checkoutStep - 1);
  updateCheckoutStepDisplay();
});

document.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
  input.addEventListener('change', updateCheckoutStepDisplay);
});
document.getElementById('deliveryMode')?.addEventListener('change', updateCheckoutStepDisplay);

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || '');
    reader.onerror = () => reject(new Error('Impossible de lire ce fichier.'));
    reader.readAsDataURL(file);
  });
}

if (articleForm) {
  articleForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const title = document.getElementById('articleTitle').value.trim();
    const category = document.getElementById('articleCategory').value;
    const excerpt = document.getElementById('articleExcerpt').value.trim();
    const imageFile = document.getElementById('articleImage').files?.[0];
    const videoFile = document.getElementById('articleVideo').files?.[0];

    if (!title || !excerpt) {
      alert('Veuillez remplir le titre et le résumé de votre article.');
      return;
    }

    try {
      const image = imageFile ? await readFileAsDataUrl(imageFile) : '';
      const video = videoFile ? await readFileAsDataUrl(videoFile) : '';

      const entry = {
        title,
        category,
        excerpt,
        image: image || '',
        video: video || ''
      };

      articlePosts.unshift(entry);
      writeStorage(articlesStorageKey, articlePosts);
      renderArticles();
      articleForm.reset();
      alert('Votre article avec média a été publié avec succès.');
    } catch (error) {
      alert(error.message || 'Le média n’a pas pu être chargé.');
    }
  });
}

if (accountForm) {
  accountForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('accountEmail').value.trim();
    const password = document.getElementById('accountPassword').value.trim();

    if (!email || !password) {
      alert('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }

    try {
      const response = await apiRequest('/api/login', { email, password });
      const accountData = { email: response.user.email, connected: true, password };
      writeStorage(STORAGE_KEYS.account, accountData);
      updateAccountStatus();
      showToast(`Bienvenue ${response.user.name || email} !`);
      closeAccountPanel();
      accountForm.reset();
    } catch (error) {
      alert(error.message || 'Connexion impossible.');
    }
  });
}

document.querySelectorAll('.faq-question').forEach((button) => {
  button.addEventListener('click', () => {
    const item = button.closest('.faq-item');
    const isActive = item.classList.contains('active');

    document.querySelectorAll('.faq-item').forEach((faqItem) => {
      faqItem.classList.remove('active');
    });

    if (!isActive) {
      item.classList.add('active');
    }
  });
});

document.querySelectorAll('.size-btn').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.size-btn').forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
  });
});

document.querySelector('[data-detail-qty="minus"]').addEventListener('click', () => {
  if (detailQty > 1) {
    detailQty -= 1;
    detailQuantity.textContent = String(detailQty);
  }
});

document.querySelector('[data-detail-qty="plus"]').addEventListener('click', () => {
  detailQty += 1;
  detailQuantity.textContent = String(detailQty);
});

detailAddToCart.addEventListener('click', () => {
  if (!activeDetailProduct) return;
  addToCart(activeDetailProduct.name, activeDetailProduct.price, activeDetailProduct.image, detailQty);
  closeDetail();
});

const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const input = newsletterForm.querySelector('input[type="email"]');
    const email = input.value.trim();

    if (!email) {
      input.focus();
      return;
    }

    try {
      const response = await apiRequest('/api/newsletter', { email });
      const savedEmails = readStorage(STORAGE_KEYS.newsletter, []);
      if (!savedEmails.includes(email)) {
        savedEmails.unshift(email);
        writeStorage(STORAGE_KEYS.newsletter, savedEmails);
      }

      input.value = '';
      showToast(response.message || 'Inscription newsletter confirmée !');
    } catch (error) {
      alert(error.message || 'Inscription impossible.');
    }
  });
}

updateAccountStatus();
updateFavoriteCount();
syncFavoriteButtons();
updateCheckoutStepDisplay();
renderArticles();
renderCart();

