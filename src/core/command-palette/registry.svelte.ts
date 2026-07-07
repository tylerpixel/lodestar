export type Command = {
  id: string;
  label: string;
  hint?: string;
  /** When set, selecting the command switches the palette to text input;
   *  Enter submits and the value is passed to run(). Quick capture. */
  input?: { placeholder: string };
  run: (input?: string) => void | Promise<void>;
};

class PaletteState {
  open = $state(false);
  commands = $state<Command[]>([]);

  toggle(): void {
    this.open = !this.open;
  }

  register(...cmds: Command[]): void {
    this.commands.push(...cmds);
  }
}

export const palette = new PaletteState();
