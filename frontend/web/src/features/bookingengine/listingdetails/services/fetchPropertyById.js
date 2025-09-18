const FetchPropertyById = async (id) => {
  const response = await fetch(
    `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=${id}`
  );
  const data = await response.json();

  // Dev-only override for demo listing visuals
  if (id === '0a1f14bb-8dd9-45a9-aeb0-9ad9b609741e' && data && data.property) {
    try {
      data.property.title = 'Canal View Loft in Amsterdam';
      data.images = [
        { key: 'https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?w=1600&q=80&auto=format&fit=crop' },
        { key: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1600&q=80&auto=format&fit=crop' },
        { key: 'https://images.unsplash.com/photo-1582582621954-2f6b364a7e9b?w=1600&q=80&auto=format&fit=crop' },
        { key: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=1600&q=80&auto=format&fit=crop' },
        { key: 'https://images.unsplash.com/photo-1475855581697-49f0b4f9b3f5?w=1600&q=80&auto=format&fit=crop' }
      ];
    } catch (_) {
      // no-op if shape differs
    }
  }

  return data;
};

export default FetchPropertyById;
