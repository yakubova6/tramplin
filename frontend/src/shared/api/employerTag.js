import { httpJson, toQuery } from './http';

const BASE_URL = '/api/employer/tags';

export async function getEmployerTags(params = {}) {
  const query = toQuery(params);
  return httpJson(`${BASE_URL}${query ? `?${query}` : ''}`);
}

export async function getEmployerTag(id) {
  return httpJson(`${BASE_URL}/${id}`);
}

export async function createEmployerTag(payload) {
  return httpJson(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getEmployerTagModerationTask(id) {
  return httpJson(`${BASE_URL}/${id}/moderation-task`);
}

export async function cancelEmployerTagModeration(id) {
  return httpJson(`${BASE_URL}/${id}/moderation-task/cancel`, {
    method: 'POST',
  });
}