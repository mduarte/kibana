/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { format as formatUrl } from 'url';
import supertest from 'supertest';

import type { Browser } from '../browser';
import type { TestSubjects } from '../test_subjects';
import { Role } from './role';
import { User } from './user';
import { FtrService, FtrProviderContext } from '../ftr_provider_context';

const TEST_USER_NAME = 'test_user';
const TEST_USER_PASSWORD = 'changeme';

export class TestUser extends FtrService {
  private readonly config = this.ctx.getService('config');
  private readonly log = this.ctx.getService('log');

  private readonly browser: Browser | void =
    // browser service is not normally available in common.
    this.ctx.hasService('browser') ? (this.ctx.getService('browser' as any) as Browser) : undefined;

  private readonly testSubjects: TestSubjects | undefined =
    // testSubject service is not normally available in common.
    this.ctx.hasService('testSubjects')
      ? (this.ctx.getService('testSubjects' as any) as TestSubjects)
      : undefined;

  constructor(
    ctx: FtrProviderContext,
    private readonly enabled: boolean,
    private readonly user: User
  ) {
    super(ctx);
  }

  async restoreDefaults(options?: { skipBrowserRefresh?: boolean }) {
    if (!this.enabled) {
      return;
    }

    await this.setRoles(this.config.get('security.defaultRoles'), options);
  }

  async setRoles(roles: string[], options?: { skipBrowserRefresh?: boolean }) {
    if (!this.enabled) {
      return;
    }

    this.log.debug(`set roles = ${roles}`);
    await this.user.create(TEST_USER_NAME, {
      password: TEST_USER_PASSWORD,
      roles,
      full_name: 'test user',
    });

    if (this.browser && this.testSubjects && !options?.skipBrowserRefresh) {
      if (
        (await this.browser.hasOpenWindow()) &&
        (await this.testSubjects.exists('kibanaChrome', { allowHidden: true }))
      ) {
        await this.browser.refresh();
        // accept alert if it pops up
        const alert = await this.browser.getAlert();
        await alert?.accept();
        await this.testSubjects.find('kibanaChrome', this.config.get('timeouts.find') * 10);
      }
    }
  }
}

export async function createTestUserService(ctx: FtrProviderContext, role: Role, user: User) {
  const log = ctx.getService('log');
  const config = ctx.getService('config');

  const enabled =
    !config
      .get('esTestCluster.serverArgs')
      .some((arg: string) => arg === 'xpack.security.enabled=false') &&
    !config.get('security.disableTestUser');

  if (enabled) {
    log.debug('===============creating roles and users===============');

    // create the defined roles (need to map array to create roles)
    for (const [name, definition] of Object.entries(config.get('security.roles'))) {
      await role.create(name, definition);
    }

    // when configured to setup remote roles, load the remote es service and set them up directly via es
    const remoteEsRoles: undefined | Record<string, any> = config.get('security.remoteEsRoles');
    if (remoteEsRoles) {
      let remoteEs;
      try {
        remoteEs = ctx.getService('remoteEs' as 'es');
      } catch (error) {
        throw new Error(
          'unable to load `remoteEs` cluster, which should provide an ES client configured to talk to the remote cluster. Include that service from another FTR config or fix the error it is throwing on creation: ' +
            error.message
        );
      }

      for (const [name, body] of Object.entries(remoteEsRoles)) {
        log.info(`creating ${name} role on remote cluster`);
        await remoteEs.security.putRole({
          name,
          ...body,
        });
      }
    }

    // delete the test_user if present (will it error if the user doesn't exist?)
    try {
      await user.delete(TEST_USER_NAME);
    } catch (exception) {
      log.debug('no test user to delete');
    }

    // create test_user with username and pwd
    log.debug(`default roles = ${config.get('security.defaultRoles')}`);
    await user.create(TEST_USER_NAME, {
      password: TEST_USER_PASSWORD,
      roles: config.get('security.defaultRoles'),
      full_name: 'test user',
    });
  }

  return new TestUser(ctx, enabled, user);
}

export function TestUserSupertestProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kibanaServerConfig = config.get('servers.kibana');

  return supertest(
    formatUrl({
      ...kibanaServerConfig,
      auth: `${TEST_USER_NAME}:${TEST_USER_PASSWORD}`,
    })
  );
}
