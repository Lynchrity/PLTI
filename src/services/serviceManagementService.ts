import type { Service } from '../types';
import {
  isMissingColumnError,
  SERVICE_BASE_COLUMNS,
  SERVICE_EXTENDED_COLUMNS,
} from '../utils/supabaseSchema';
import { supabase } from './supabase';

async function selectServices(creatorId?: string) {
  let extendedQuery = supabase.from('services').select(SERVICE_EXTENDED_COLUMNS);
  if (creatorId) {
    extendedQuery = extendedQuery.eq('creator_id', creatorId);
  }

  const extended = await extendedQuery.order('created_at', { ascending: false });
  if (!extended.error) {
    return extended;
  }

  if (isMissingColumnError(extended.error)) {
    let baseQuery = supabase.from('services').select(SERVICE_BASE_COLUMNS);
    if (creatorId) {
      baseQuery = baseQuery.eq('creator_id', creatorId);
    }
    return baseQuery.order('created_at', { ascending: false });
  }

  return extended;
}

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeServiceInput(
  input: Omit<Service, 'service_id' | 'creator_id' | 'created_at'>,
): Omit<Service, 'service_id' | 'creator_id' | 'created_at'> {
  return {
    ...input,
    topic: optionalText(input.topic),
    description: optionalText(input.description ?? null),
    banner_url: input.banner_url?.trim() ? input.banner_url : null,
    grade_level: optionalText(input.grade_level ?? null),
  };
}

function stripExtendedServiceFields(
  input: Omit<Service, 'service_id' | 'creator_id' | 'created_at'>,
): Record<string, unknown> {
  return {
    type: input.type,
    title: input.title,
    duration_minutes: input.duration_minutes,
    price: input.price,
    subject: input.subject,
    topic: input.topic,
  };
}

export async function getMyServices(creatorId: string): Promise<Service[]> {
  const { data, error } = await selectServices(creatorId);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createService(
  creatorId: string,
  input: Omit<Service, 'service_id' | 'creator_id' | 'created_at'>,
): Promise<Service> {
  const normalized = normalizeServiceInput(input);
  const fullPayload = { ...normalized, creator_id: creatorId };

  let result = await supabase
    .from('services')
    .insert(fullPayload)
    .select(SERVICE_EXTENDED_COLUMNS)
    .single();

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from('services')
      .insert({ ...stripExtendedServiceFields(normalized), creator_id: creatorId })
      .select(SERVICE_BASE_COLUMNS)
      .single();
  }

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

export async function updateService(
  serviceId: string,
  creatorId: string,
  input: Partial<Omit<Service, 'service_id' | 'creator_id' | 'created_at'>>,
): Promise<Service> {
  let result = await supabase
    .from('services')
    .update(input)
    .eq('service_id', serviceId)
    .eq('creator_id', creatorId)
    .select(SERVICE_EXTENDED_COLUMNS)
    .single();

  if (result.error && isMissingColumnError(result.error)) {
    const { description: _d, banner_url: _b, grade_level: _g, ...baseInput } = input;
    result = await supabase
      .from('services')
      .update(baseInput)
      .eq('service_id', serviceId)
      .eq('creator_id', creatorId)
      .select(SERVICE_BASE_COLUMNS)
      .single();
  }

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

export async function deleteService(serviceId: string, creatorId: string): Promise<void> {
  const { data: linked, error: linkedError } = await supabase
    .from('schedules')
    .select('schedule_id')
    .eq('service_id', serviceId)
    .limit(1);

  if (linkedError) {
    throw linkedError;
  }

  if (linked && linked.length > 0) {
    throw new Error(
      'Cannot delete this service because it has booked sessions. Wait until sessions are completed or cancelled.',
    );
  }

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('service_id', serviceId)
    .eq('creator_id', creatorId);

  if (error) {
    throw error;
  }
}
