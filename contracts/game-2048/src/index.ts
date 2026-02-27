import { Blockchain } from '@btc-vision/btc-runtime/runtime';
import { revertOnError } from '@btc-vision/btc-runtime/runtime/abort/abort';
import { Game2048Contract } from './Game2048Contract';

// Factory function returning a new contract instance
Blockchain.contract = (): Game2048Contract => {
  return new Game2048Contract();
};

// Re-export runtime bindings required by the VM
export * from '@btc-vision/btc-runtime/runtime/exports';

// Abort handler wired to OPNet's revert helper
export function abort(
  message: string,
  fileName: string,
  line: u32,
  column: u32,
): void {
  revertOnError(message, fileName, line, column);
}

