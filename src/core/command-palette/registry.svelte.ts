export type Command = {
  id: string;
  label: string;
  hint?: string;
  /** Listed in the header's Add menu (units/atoms: notes, jobs, habits…). */
  capture?: boolean;
  /** When set, selecting the command switches the palette to text input;
   *  Enter submits and the value is passed to run(). Quick capture. */
  input?: { placeholder: string };
  run: (input?: string) => void | Promise<void>;
};

class PaletteState {
  open = $state(false);
  commands = $state<Command[]>([]);
  /** Consumed by the palette on open: jumps straight into input mode. */
  seedInput = $state<Command | null>(null);

  toggle(): void {
    this.open = !this.open;
  }

  /** Open the palette directly in a command's input mode (Add menu path). */
  openCapture(cmd: Command): void {
    this.seedInput = cmd;
    this.open = true;
  }

  register(...cmds: Command[]): void {
    this.commands.push(...cmds);
  }
}

export const palette = new PaletteState();
