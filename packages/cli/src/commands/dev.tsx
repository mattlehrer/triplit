import React from 'react';
import { Box, Newline, Spacer, Text } from 'ink';
import { createServer as createConsoleServer } from '@triplit/console';
import { createServer as createDBServer } from '@triplit/server';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { getDataDir } from '../filesystem.js';

export const description = 'Starts the Triplit development environment';
export const flags = {};
export const args = {};

export async function run({ flags }) {
  const consolePort = flags.consolePort || 6542;
  const dbPort = flags.dbPort || 6543;

  process.env.JWT_SECRET =
    process.env.JWT_SECRET ?? 'jwt-key-for-development-only';
  process.env.PROJECT_ID = process.env.PROJECT_ID ?? 'local-project-id';

  if (flags.storage === 'sqlite') {
    const dataDir = getDataDir();
    const sqlitePath = path.join(dataDir, 'sqlite', 'app.db');
    if (!fs.existsSync(path.dirname(sqlitePath))) {
      fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
    }
    process.env.LOCAL_DATABASE_URL = sqlitePath;
  }

  const serviceKey = jwt.sign(
    {
      'x-triplit-token-type': 'secret',
      'x-triplit-project-id': process.env.PROJECT_ID,
    },
    process.env.JWT_SECRET
  );

  const anonKey = jwt.sign(
    {
      'x-triplit-token-type': 'anon',
      'x-triplit-project-id': process.env.PROJECT_ID,
    },
    process.env.JWT_SECRET
  );

  const startDBServer = createDBServer({ storage: flags.storage || 'memory' });
  const dbServer = startDBServer(dbPort);
  const consoleServer = createConsoleServer('../../console', {
    token: serviceKey,
    projName: 'tripli-test',
    server: `http://localhost:${dbPort}`,
  });
  consoleServer.listen(consolePort);

  process.on('SIGINT', function () {
    dbServer.close();
    consoleServer.close();
    process.exit();
  });

  return (
    <>
      <Newline />
      <Box flexDirection="column" gap={1}>
        <Text bold underline color={'magenta'}>
          Triplit Development Environment
        </Text>
        <Box flexDirection="column">
          <Text>
            You can access your local Triplit services at the following local
            URLs:
          </Text>
          <Box
            width={48}
            flexDirection="column"
            borderStyle="single"
            paddingX={1}
          >
            <Box>
              <Text bold>🟢 Console</Text>
              <Spacer />
              <Text color="cyan">{`http://localhost:${consolePort}`}</Text>
            </Box>
            <Box>
              <Text bold>🟢 Database</Text>
              <Spacer />
              <Text color="cyan">{`http://localhost:${dbPort}`}</Text>
            </Box>
          </Box>
        </Box>
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="column">
            <Text bold underline>
              Service Key
            </Text>
            <Text wrap="end">{serviceKey}</Text>
          </Box>
          <Box flexDirection="column">
            <Text bold underline>
              Anon Token
            </Text>
            <Text wrap="end">{anonKey}</Text>
          </Box>
        </Box>
      </Box>
    </>
  );
}
