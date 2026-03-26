import PropTypes from "prop-types";
import styles from "./WebsiteBuilderPage.module.scss";
import TemplateCursorLayer from "./TemplateCursorLayer";
import { WEBSITE_TEMPLATE_LAYOUTS } from "./websiteTemplates";
import { getTemplateSilhouetteLayout } from "./templateSilhouetteLayouts";

function TemplateSilhouette({ layout }) {
  const silhouetteLayout = getTemplateSilhouetteLayout(layout);
  const { canvasClassName, Component } = silhouetteLayout;

  return (
    <TemplateCursorLayer layout={layout}>
      {({ getCanvasProps, getTargetProps, cursor }) => (
        <div {...getCanvasProps({ className: `${styles.templateCanvas} ${canvasClassName}`, "aria-hidden": "true" })}>
          <Component getTargetProps={getTargetProps} />
          {cursor}
        </div>
      )}
    </TemplateCursorLayer>
  );
}

TemplateSilhouette.propTypes = {
  layout: PropTypes.oneOf(WEBSITE_TEMPLATE_LAYOUTS).isRequired,
};

export default TemplateSilhouette;
