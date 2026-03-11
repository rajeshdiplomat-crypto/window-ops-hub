import { ConfigList } from "./GeneralSettingsPage";

export default function MastersSettingsPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <ConfigList table="salespersons" title="Salespersons" />
      <ConfigList table="dealers" title="Dealer Names" />
      <ConfigList table="project_client_names" title="Project Client Names" />
      <ConfigList table="project_names" title="Project Names" />
      <ConfigList table="colour_shades" title="Colour Shades" />
      <ConfigList table="other_product_types" title="Products" />
      <ConfigList table="coating_vendors" title="Coating Vendors" />
    </div>
  );
}
