//@ts-expect-error Something is going on with astro imports
import { navigate } from "astro:transitions/client";
import {
  StaticTreeDataProvider,
  Tree,
  UncontrolledTreeEnvironment,
  type TreeItem,
  type TreeItemIndex,
} from "react-complex-tree";
import "react-complex-tree/lib/style-modern.css";

type Props = {
  items: Record<TreeItemIndex, TreeItem>;
  urls: Record<string, string>;
  currentPageId: string;
  apiPrefix: string;
};

export default function PageTree({
  items,
  urls,
  currentPageId,
  apiPrefix,
}: Props) {
  return (
    <div
      style={{
        position: "fixed",
        top: "5%",
        right: "1em",
        minWidth: "240px",
        padding: "0.5em 0.75em",
        borderRadius: "0.5em",
        background: "#EEEEEE88",
        backdropFilter: "blur(2px)",
        zIndex: 1,
      }}
    >
      <UncontrolledTreeEnvironment
        dataProvider={new StaticTreeDataProvider(items)}
        getItemTitle={(item) => item.data as string}
        viewState={{
          tree: {
            expandedItems: Object.keys(items),
            selectedItems: [currentPageId],
          },
        }}
        canDragAndDrop
        canDropOnFolder
        canReorderItems
        onDrop={async (droppedItems, target) => {
          const id = droppedItems[0]?.index as string;
          let parentId: string | null = null;
          let beforeId: string | undefined;
          let afterId: string | undefined;

          if (target.targetType === "item") {
            parentId =
              target.targetItem === "root"
                ? null
                : (target.targetItem as string);
          } else if (target.targetType === "between-items") {
            parentId =
              target.parentItem === "root"
                ? null
                : (target.parentItem as string);
            const siblings = items[target.parentItem]?.children ?? [];
            const idx = target.childIndex;
            if (idx < siblings.length) {
              beforeId = siblings[idx] as string;
            }
            if (idx > 0) {
              afterId = siblings[idx - 1] as string;
            }
          }

          await fetch(`${apiPrefix}/move`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, parentId, beforeId, afterId }),
          });
          navigate(window.location.href);
        }}
        onSelectItems={(itemIds) => {
          const id = itemIds[0] as string;
          if (id && urls[id]) {
            navigate(urls[id]);
          }
        }}
      >
        <Tree treeId="tree" rootItem="root" />
      </UncontrolledTreeEnvironment>
    </div>
  );
}
