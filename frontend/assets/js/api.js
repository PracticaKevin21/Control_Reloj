async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.mensaje || "Error en la solicitud");
  }

  return data;
}

function apiGet(endpoint) {
  return apiRequest(endpoint, {
    method: "GET"
  });
}

function apiPost(endpoint, body) {
  return apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

function apiPut(endpoint, body) {
  return apiRequest(endpoint, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

function apiDelete(endpoint) {
  return apiRequest(endpoint, {
    method: "DELETE"
  });
}