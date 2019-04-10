import httpStatusCodes from 'http-status-codes';
import supertest from 'supertest';
import cheerio from 'cheerio';
import expect from 'expect.js';
import logger from 'logger';
import environment from '../../environment';

const {
  start,
  createCookie,
  insertAgency,
  removeAgencies,
  insertKitten,
  removeKittens,
  getKittens,
} = environment;

describe('List kittens', () => {
  let request;
  let cookie;
  let features;
  const userId = 1;
  const agencyId = 2;

  before(async () => {
    const context = await start();
    features = context.features;
    features.enabled = () => false;
    request = supertest(context.app);
    cookie = await createCookie(userId, 'adalovelace', 'Ada', 'Lovelace', 'ada@cats.com');
  });

  beforeEach(removeKittens);
  beforeEach(removeAgencies);
  beforeEach(() => insertAgency({ employerData: { onlineId: agencyId } }));

  describe('access', () => {
    it('should require a cookie', () =>
      request
        .get(`/cat-manager/${agencyId}/kittens`)
        .expect(httpStatusCodes.UNAUTHORIZED));

    it('should restrict permission', async () => {
      const invalidCookie = await createCookie(123);
      await request
        .get(`/cat-manager/${agencyId}/kittens`)
        .set('Cookie', invalidCookie)
        .expect(httpStatusCodes.FORBIDDEN);
    });
  });

  it('should 404 if the agency does not exist', async () => {
    logger.disable();
    await removeAgencies();
    await request
      .get(`/cat-manager/${agencyId}/kitten-form`)
      .set('Cookie', cookie)
      .expect(httpStatusCodes.NOT_FOUND);
  });

  it('should show a sorted list of kittens for an agency', async () => {
    await Promise.all([
      insertKitten({ agencyId, firstName: 'Paul', lastName: 'Barner', kittenId: 'kitten1' }),
      insertKitten({ agencyId, firstName: 'Annie', lastName: 'Louise', kittenId: 'kitten2' }),
    ]);
    const dbKittens = await getKittens();
    expect(dbKittens.length).to.equal(2);

    const response = await request
      .get(`/cat-manager/${agencyId}/kittens`)
      .set('Cookie', cookie)
      .expect(httpStatusCodes.OK);
    const $ = cheerio.load(response.text);
    const addKittenButton = $('.t-add-kitten');
    const htmlKittens = $('.t-kitten');

    expect($('title').text()).to.equal('Tes - Kittens');
    expect(addKittenButton.text()).to.equal('Add kitten');
    expect(htmlKittens.length).to.equal(2);
    expect(htmlKittens.eq(0).text()).to.contain('Barner, Paul');
    expect(htmlKittens.eq(1).text()).to.contain('Louise, Annie');
  });

  describe('option to add a kitten for in-house agencies', () => {
    const inHouseAgencyId = 1163552;
    const inHouseAgencyAdminId = 2082605567;
    let inHouseAgencyCookie;
    before(async () => {
      inHouseAgencyCookie = await createCookie(inHouseAgencyAdminId, 'adalovelace', 'Ada', 'Lovelace', 'ada@cats.com');
    });
    beforeEach(() => insertAgency({ employerData: { onlineId: inHouseAgencyId } }));

    it('should not display option when feature is toggled off', async () => {
      await insertKitten({ agencyId: inHouseAgencyId, firstName: 'Paul', lastName: 'Barner', kittenId: 'kitten1' });

      const response = await request
        .get(`/cat-manager/${inHouseAgencyId}/kittens`)
        .set('Cookie', inHouseAgencyCookie)
        .expect(httpStatusCodes.OK);

      const $ = cheerio.load(response.text);

      expect($('.t-add-kitten').length).to.equal(0);
    });

    it('should not display option when feature is toggled off... again', async () => {
      await insertKitten({ agencyId: inHouseAgencyId, firstName: 'Paul', lastName: 'Barner', kittenId: 'kitten1' });

      const response = await request
        .get(`/cat-manager/${inHouseAgencyId}/kittens`)
        .set('Cookie', inHouseAgencyCookie)
        .expect(httpStatusCodes.OK);

      const $ = cheerio.load(response.text);

      expect($('.t-add-kitten').length).to.equal(0);
    });

    it('should display option when feature is toggled on for user', async () => {
      features.enabled = ({ flag }) => (flag === 'cat-display-add-kitten-button');
      await insertKitten({ agencyId: inHouseAgencyId, firstName: 'Paul', lastName: 'Barner', kittenId: 'kitten1' });

      const response = await request
        .get(`/cat-manager/${inHouseAgencyId}/kittens`)
        .set('Cookie', inHouseAgencyCookie)
        .expect(httpStatusCodes.OK);

      const $ = cheerio.load(response.text);

      expect($('.t-add-kitten').length).to.equal(1);

      features.enabled = () => false;
    });
  });

  it('should not show kittens from a different agency', async () => {
    await Promise.all([
      insertKitten({ agencyId, firstName: 'Paul', lastName: 'Barner', kittenId: 'kitten1' }),
      insertKitten({ agencyId: 2342, firstName: 'Annie', lastName: 'Louise', kittenId: 'kitten2' }),
    ]);
    const dbKittens = await getKittens();
    expect(dbKittens.length).to.equal(2);

    const response = await request
      .get(`/cat-manager/${agencyId}/kittens`)
      .set('Cookie', cookie)
      .expect(httpStatusCodes.OK);
    const $ = cheerio.load(response.text);
    const htmlKittens = $('.t-kitten');

    expect(htmlKittens.length).to.equal(1);
    expect(htmlKittens.text()).not.to.contain('Louise, Annie');
    expect(htmlKittens.text()).to.contain('Barner, Paul');
  });
});
