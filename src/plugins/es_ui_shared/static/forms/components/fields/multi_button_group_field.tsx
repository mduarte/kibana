/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonGroup, EuiButtonGroupOptionProps, EuiFormRow } from '@elastic/eui';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../hook_form_lib';

export interface MultiButtonGroupFieldValue {
  [id: string]: boolean;
}

interface Props {
  field: FieldHook;
  euiFieldProps: {
    options: EuiButtonGroupOptionProps[];
    legend: string;
    [key: string]: any;
  };
  idAria?: string;
  [key: string]: any;
}

export const MultiButtonGroupField = ({ field, euiFieldProps, idAria, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  return (
    <EuiFormRow
      label={field.label}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      {...rest}
    >
      <EuiButtonGroup
        isFullWidth
        onChange={(e) => {
          const value = field.value as MultiButtonGroupFieldValue;
          field.setValue({ ...value, [e]: !value[e] });
        }}
        idToSelectedMap={field.value as MultiButtonGroupFieldValue}
        type="multi"
        data-test-subj="button-group"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
