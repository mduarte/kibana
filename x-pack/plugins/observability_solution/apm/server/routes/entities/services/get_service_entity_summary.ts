/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntitiesESClient } from '../../../lib/helpers/create_es_client/create_entities_es_client/create_entities_es_client';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getEntityLatestServices } from '../get_entity_latest_services';
import { calculateAvgMetrics } from '../utils/calculate_avg_metrics';
import { mergeEntities } from '../utils/merge_entities';
import { MAX_NUMBER_OF_SERVICES } from './get_service_entities';

interface Params {
  entitiesESClient: EntitiesESClient;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
}

export function getServiceEntitySummary({
  end,
  entitiesESClient,
  environment,
  serviceName,
  start,
}: Params) {
  return withApmSpan('get_service_entity_summary', async () => {
    const entityLatestServices = await getEntityLatestServices({
      entitiesESClient,
      start,
      end,
      environment,
      size: MAX_NUMBER_OF_SERVICES,
      serviceName,
    });

    const serviceEntity = calculateAvgMetrics(mergeEntities({ entities: entityLatestServices }));
    return serviceEntity[0];
  });
}
