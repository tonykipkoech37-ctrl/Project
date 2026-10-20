async function loadListings() {
  const params = new URLSearchParams();
  for (const id of ['q', 'make', 'minPrice', 'maxPrice', 'minYear', 'maxYear', 'sort']) {
    const v = document.getElementById(id).value;
    if (v) params.set(id, v);
  }
  const res = await fetch(`/api/listings?${params}`);
  const cars = await res.json();
  document.getElementById('results').innerHTML = cars.map(carCard).join('') ||
    '<p class="empty">No cars match your filters.</p>';
}

function carCard(c) {
  return `
    <a class="card" href="listing.html?id=${c.id}">
      <img src="${c.photo || 'placeholder.png'}" alt="${c.make} ${c.model}" />
      <div class="info">
        <h3>${c.year} ${c.make} ${c.model}</h3>
        <p class="price">$${c.price.toLocaleString()}</p>
        <p class="meta">${c.mileage.toLocaleString()} km · ${c.fuel || '—'} · ${c.transmission || '—'}</p>
      </div>
    </a>`;
}

async function loadMakes() {
  const makes = await (await fetch('/api/makes')).json();
  document.getElementById('make').insertAdjacentHTML('beforeend',
    makes.map(m => `<option value="${m}">${m}</option>`).join(''));
}

loadMakes();
loadListings();