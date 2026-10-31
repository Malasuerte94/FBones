import type { EditMode, EditorTool } from './project.ts';

interface ToolContext {
  mode: EditMode;
  sceneEditing: boolean;
  selectedAttachmentIds: readonly number[];
}

/** Whole-attachment tools exit clipping vertex editing without selecting bones. */
export function toolEditMode(context: ToolContext, tool: EditorTool): EditMode {
  if (tool === 'pan') return context.mode;
  if (context.sceneEditing && context.selectedAttachmentIds.length > 0
    && (context.mode === 'images' || context.mode === 'clipping')
    && (tool === 'translate' || tool === 'rotate' || tool === 'scale')) return 'images';
  return 'bones';
}
