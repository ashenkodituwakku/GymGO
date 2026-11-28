/**
 * Photos of the curated gyms, each one looked at on the gym's own website
 * and kept only when it shows that gym: its floor, its rooms, its front, or
 * a class in its own space. Never a logo, a poster, a stock picture (one a
 * chain's other branches show too, or a photo library's), a staff portrait
 * on its own, a render of a place not yet built, or a photo from anywhere
 * but the gym's own site. On a site with several branches, only a picture
 * on that branch's own page, and not on another branch's, counts. A gym
 * with none here shows none from its website.
 *
 * Only the addresses are kept, with the page each is on (its credit) and
 * when it was checked; the GymGO server fetches each from the gym's site,
 * checks it is still a photograph, and keeps it a month. The photos belong
 * to the gyms.
 *
 * Checked on 25 October 2026, every curated gym's own pages. None for:
 * Doherty's City and Brunswick (one site for both, and its branch pages
 * have no photos), Australian Strength Performance (a group photo only),
 * Next Level Fitness (its site no longer answers), Equilibrium Fitness and
 * The Strong Zone (their pages draw their pictures in the browser), RBT
 * (its site timed out), L9 Fitness & Skills (video covers and posters only,
 * on pages shared by its five sites), Fitness XO (its photos aren't said to
 * be Northcote's or Richmond's), Prosport (Richmond's and Prahran's on one
 * page, the rest of retreats abroad) and Lincoln Square Fitness (the
 * university's page mixes three centres' photos).
 */

export interface ApprovedPhoto {
  /** The picture's address, on the gym's own site or the image host that site uses. */
  url: string;
  /** The gym's own page it appears on: what it's credited to, and where to check it again. */
  page: string;
  /** What it shows, as checked. */
  shows: string;
  /** When it was checked. */
  checkedAt: string;
}

const CHECKED = '2026-10-25';

const on = (page: string, photos: Array<[url: string, shows: string]>): ApprovedPhoto[] =>
  photos.map(([url, shows]) => ({ url, page, shows, checkedAt: CHECKED }));

/** Each curated gym's checked photos, by gym id, the cover first (four at most are shown). */
export const MELBOURNE_PHOTOS: Readonly<Record<string, readonly ApprovedPhoto[]>> = {
  'goodlife-fitzroy': on('https://www.goodlife.com.au/clubs/fitzroy/', [
    [
      'https://images.ctfassets.net/zqfcw6ceqcqc/5jE8wSQ5h709nsIDVoeFpE/32e3a90ec4fa3eef62e3e84b57a91398/WEB0045_New_Website_-_Images_VICClubs_Fitzroy_800x400.jpg',
      'The gym floor: a suspension-training frame, machines and the orange walls (named for Fitzroy; other GoodLife clubs share one stock picture)',
    ],
    [
      'https://images.ctfassets.net/zqfcw6ceqcqc/28mLLaW3DT4k2xzsmUEwkK/ab2fe868de6515848fe24455b0b5a487/Goodlife-Fitzroy-Gym-Melbourne-Weights-Area.jpg',
      'The weights area: racks, barbells and benches (named for Fitzroy)',
    ],
  ]),
  'carlton-fitness': on('https://www.carltonfitnessgym.com.au/', [
    [
      'https://static.wixstatic.com/media/455e99_998ab1e1174446a789bdf52612c1f794~mv2_d_2223_1322_s_2.jpg',
      'The gym floor: machines and racks on timber and rubber flooring (the site’s own upload; its other pictures are a posed model, a video still and a poster)',
    ],
  ]),
  'crossfit-collingwood': on('https://www.theoxbox.fit/', [
    ['https://static.wixstatic.com/media/590bc7_835980604a0a481597ce7da9c366e177~mv2.jpg', 'A class with dumbbells, under the brick walls and timber beams (Ox Box, the home of CrossFit Collingwood)'],
    ['https://static.wixstatic.com/media/590bc7_dc6c9dcd8daa4e58bbdebe9e501dc30c~mv2.png', 'A class doing push-ups along the rubber floor, from the same shoot'],
  ]),
  'prime-athletica-fitzroy': on('https://www.primeathletica.com.au/fitzroy', [
    [
      'https://images.squarespace-cdn.com/content/v1/66b703ab34db6359c0dc110f/c60f51fb-0728-41ba-8c0e-e0c3a9d99fdb/Spacious%2C+bright+and+clean+Class+area?format=1500w',
      'The class area: white walls, arched windows, treadmills and ski machines (on the Fitzroy page only, not Thornbury’s or Ivanhoe’s)',
    ],
    ['https://images.squarespace-cdn.com/content/v1/66b703ab34db6359c0dc110f/478a58b3-c459-4070-9e66-eb088ecbbcf3/Resistance+training?format=1500w', 'A trainer and a member with a plate, at the racks by the teal wall'],
    ['https://images.squarespace-cdn.com/content/v1/66b703ab34db6359c0dc110f/e2510bc1-6072-473c-9fc9-09bb52c44bfe/Fully+equiped+gym?format=1500w', 'A member on a machine on the gym floor'],
    ['https://images.squarespace-cdn.com/content/v1/66b703ab34db6359c0dc110f/cb4ebefb-4fb4-41a2-a4c8-652460828b7f/Cardio+workout?format=1500w', 'Air bikes in the cardio area'],
  ]),
  'absolute-mma-melbourne-cbd': on('https://absolutemma.com.au/locations/absolute-melbourne-cbd/', [
    ['https://absolutemma.com.au/wp-content/uploads/2021/06/MMA_CBD06.jpg', 'The mats and the cage (the CBD location’s own numbered photos)'],
    ['https://absolutemma.com.au/wp-content/uploads/2021/06/MMA_CBD05.jpg', 'The boxing ring and bags'],
    ['https://absolutemma.com.au/wp-content/uploads/2021/06/MMA_CBD02.jpg', 'The gym floor: rowers, bikes and a cable machine'],
    ['https://absolutemma.com.au/wp-content/uploads/2021/06/MMA_CBD03.jpg', 'The weights room: racks and plates'],
  ]),
  'anytime-fitness-collingwood': on('https://www.anytimefitness.com/en-au/locations/collingwood-victoria-au-1308', [
    ['https://anytimefitness.blob.core.windows.net/club-profile-photos/AU-1308/Large_bb1f_IMG_5704.JPG', 'The front of the club, at 164 Wellington Street (the number is on the building)'],
    ['https://anytimefitness.blob.core.windows.net/club-profile-photos/AU-1308/Large_ed0c_IMG_5540.jpeg', 'The open studio floor and its AF wall'],
    ['https://anytimefitness.blob.core.windows.net/club-profile-photos/AU-1308/Large_0137_IMG_5548.jpeg', 'Spin bikes along the window'],
    ['https://anytimefitness.blob.core.windows.net/club-profile-photos/AU-1308/Large_58d2_IMG_5547.jpeg', 'Treadmills and cross-trainers'],
  ]),
  'anytime-fitness-docklands': on('https://www.anytimefitness.com/en-au/locations/docklands-victoria-au-1256', [
    ['https://anytimefitness.blob.core.windows.net/club-profile-photos/AU-1256/Large_7584_a7b2b114-ab1d-49d3-b4ce-8e87cef2371f.jpeg', 'The weights area: racks, plates and a rower on purple turf'],
    ['https://anytimefitness.blob.core.windows.net/club-profile-photos/AU-1256/Large_519c_4fd25529-9b21-4b45-b880-eb153969ecee.jpeg', 'The machines and cardio floor'],
    ['https://anytimefitness.blob.core.windows.net/club-profile-photos/AU-1256/Large_f0d9_6cc5d795-ecab-48b9-9263-fd5f1e1674d8.jpeg', 'Treadmills and bikes along the wall'],
  ]),
  'anytime-fitness-south-melbourne': on('https://www.anytimefitness.com/en-au/locations/south-melbourne-victoria-au-1263', [
    ['https://anytimefitness.blob.core.windows.net/club-profile-photos/AU-1263/Large_aad6_dumbell%20area.jpg', 'The dumbbell area and benches by the windows'],
    ['https://anytimefitness.blob.core.windows.net/club-profile-photos/AU-1263/Large_c2c9_rack.jpg', 'The racks and lifting platforms'],
    ['https://anytimefitness.blob.core.windows.net/club-profile-photos/AU-1263/Large_a4ce_functional.jpg', 'The functional area: an air bike, bags and the AF wall'],
    ['https://anytimefitness.blob.core.windows.net/club-profile-photos/AU-1263/Large_8630_entry.jpg', 'The entry, with cross-trainers along the windows'],
  ]),
  'snap-fitness-fitzroy': on('https://www.snapfitness.com/au/gyms/fitzroy', [
    ['https://storage-prod.twotaps.io/uploads/images/9502c239-56bb-4d42-a219-864440fa3d99/FP08740.jpg?w=1536&h=1024', 'The front, under the Snap Fitness sign'],
    ['https://storage-prod.twotaps.io/uploads/images/0368ccaa-336e-4388-8683-e22d782a8d2d/FP08809.jpg?w=1536&h=1024', 'Plate-loaded machines under the FITZROY mural on the brick wall'],
    ['https://storage-prod.twotaps.io/uploads/images/b7fbac5d-02d8-4781-9436-96fb56a1730f/FP08820.jpg?w=1536&h=1024', 'The dumbbell rack, benches and racks'],
    ['https://storage-prod.twotaps.io/uploads/images/092a1867-8250-46bf-8b91-d3ed919a1cde/FP08765.jpg?w=1536&h=1024', 'Treadmills by the front windows'],
  ]),
  'snap-fitness-brunswick': on('https://www.snapfitness.com/au/gyms/brunswick', [
    ['https://storage-prod.twotaps.io/uploads/images/4cfb2d90-f7d9-4d3d-89a7-2465b2e5ae82/DSCF9258.png?w=1537.0260521042085&h=1024', 'The functional area under the mezzanine'],
    ['https://storage-prod.twotaps.io/uploads/images/aa56958a-449e-45b3-960f-b20caa1c9e5c/DSCF9244.png?w=1537.0260521042085&h=1024', 'The racks and plates'],
    ['https://storage-prod.twotaps.io/uploads/images/18b6e3db-56c4-4e1f-846b-3da31cd5d56b/DSCF9253.png?w=1537.0260521042085&h=1024', 'The dumbbell rack and benches'],
    ['https://storage-prod.twotaps.io/uploads/images/197713c3-828a-415f-9e83-ff9625eb15ea/DSCF9266.png?w=1537.0260521042085&h=1024', 'Treadmills and cardio machines'],
  ]),
  'quickfit-brunswick-east': on('https://www.quickfit.com.au/quickfit-brunswick', [
    [
      'https://images.squarespace-cdn.com/content/v1/67c9214e7de0b36e79cfaba2/1764929275301-Y8E37CZ0SKL69DOWP32V/486636087_1130519782421684_4761234297251727878_n.jpg?format=1500w',
      'The gym floor: a rack, plates and the turf strip (on the Brunswick page; the site’s other pages show other clubs)',
    ],
    [
      'https://images.squarespace-cdn.com/content/v1/67c9214e7de0b36e79cfaba2/1764929382527-D39B6YHMO90EEZIQ7ZI9/486795072_1130519802421682_2975306404454070106_n.jpg?format=1500w',
      'Machines on the gym floor, under the QuickFit sign',
    ],
  ]),
  'leo-berrys-gym-richmond': on('https://richmondboxing.com.au/', [
    ['https://richmondboxing.com.au/__l5e/assets-v1/7dce89db-5e2a-403f-96b0-d67b3c6efaf4/gym-7V103038.jpg', 'The gym: heavy bags, spin bikes and the tiger mural'],
    ['https://richmondboxing.com.au/__l5e/assets-v1/ef925b53-d61e-4a20-9446-06e97f64d0dd/gym-7V103030.jpg', 'The ring and bags under the Richmond Boxing Club banner'],
    ['https://richmondboxing.com.au/__l5e/assets-v1/bd013dbf-854b-4527-9fa3-029ec2a343f3/gym-7V102986.jpg', 'Heavy bags along the timber walls, the ring behind'],
    ['https://richmondboxing.com.au/__l5e/assets-v1/916e6eba-a263-49f8-91f6-6b58ee4de44a/gym-7V103004.jpg', 'The weights corner: a bench, barbells and bands'],
  ]),
};
