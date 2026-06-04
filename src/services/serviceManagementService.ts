import type { Service } from '../types';
import { supabase } from './supabase';

export async function getMyServices(creatorId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('service_id, creator_id, type, title, duration_minutes, price, subject, topic, created_at')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createService(
  creatorId: string,
  input: Omit<Service, 'service_id' | 'creator_id' | 'created_at'>,
): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .insert({ ...input, creator_id: creatorId })
    .select('service_id, creator_id, type, title, duration_minutes, price, subject, topic, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateService(
  serviceId: string,
  creatorId: string,
  input: Partial<Omit<Service, 'service_id' | 'creator_id' | 'created_at'>>,
): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .update(input)
    .eq('service_id', serviceId)
    .eq('creator_id', creatorId)
    .select('service_id, creator_id, type, title, duration_minutes, price, subject, topic, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteService(serviceId: string, creatorId: string): Promise<void> {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('service_id', serviceId)
    .eq('creator_id', creatorId);

  if (error) {
    throw error;
  }
}
