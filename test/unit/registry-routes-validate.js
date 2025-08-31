const expect = require('chai').expect;
const sinon = require('sinon');

describe('registry : routes : validate', () => {
  const ValidateRoute = require('../../dist/registry/routes/validate').default;
  let resJsonStub;
  let statusStub;
  let validateRoute;
  let req;
  let res;

  const initialise = () => {
    resJsonStub = sinon.stub();
    statusStub = sinon.stub().returns({ json: resJsonStub });
    validateRoute = ValidateRoute();
    req = {
      body: {},
      headers: {},
      params: {}
    };
    res = {
      status: statusStub,
      json: resJsonStub,
      conf: {}
    };
  };

  describe('when packageJson is missing in body', () => {
    before(async () => {
      initialise();
      await validateRoute(req, res);
    });

    it('should return 400 status', () => {
      expect(statusStub.calledWith(400)).to.be.true;
    });

    it('should return error message', () => {
      expect(resJsonStub.calledWith({
        error: 'Invalid request: packageJson is required in request body'
      })).to.be.true;
    });
  });

  describe('when component name and version are missing', () => {
    before(async () => {
      initialise();
      req.body = { packageJson: {} };
      await validateRoute(req, res);
    });

    it('should return 400 status', () => {
      expect(statusStub.calledWith(400)).to.be.true;
    });

    it('should return error message about missing name and version', () => {
      expect(resJsonStub.calledWith({
        error: 'Component name and version are required (either in URL params or package.json)'
      })).to.be.true;
    });
  });

  describe('when component name is invalid', () => {
    before(async () => {
      initialise();
      req.body = { 
        packageJson: { 
          name: 'invalid@name', 
          version: '1.0.0' 
        } 
      };
      await validateRoute(req, res);
    });

    it('should return 409 status', () => {
      expect(statusStub.calledWith(409)).to.be.true;
    });

    it('should return error code and message', () => {
      expect(resJsonStub.calledWith({
        code: 'name_not_valid',
        error: 'Component name is not valid'
      })).to.be.true;
    });
  });

  describe('when component version is invalid', () => {
    before(async () => {
      initialise();
      req.body = { 
        packageJson: { 
          name: 'valid-name', 
          version: 'invalid-version' 
        } 
      };
      await validateRoute(req, res);
    });

    it('should return 409 status', () => {
      expect(statusStub.calledWith(409)).to.be.true;
    });

    it('should return error code and message', () => {
      expect(resJsonStub.calledWith({
        code: 'version_not_valid',
        error: 'Component version is not valid'
      })).to.be.true;
    });
  });

  describe('when validation is successful', () => {
    before(async () => {
      initialise();
      req.body = { 
        packageJson: { 
          name: 'valid-component', 
          version: '1.0.0' 
        } 
      };
      await validateRoute(req, res);
    });

    it('should return 200 status', () => {
      expect(statusStub.calledWith(200)).to.be.true;
    });

    it('should return success message', () => {
      expect(resJsonStub.calledWith({
        valid: true,
        message: 'Package validation successful'
      })).to.be.true;
    });
  });

  describe('when using URL params for component name and version', () => {
    before(async () => {
      initialise();
      req.params = {
        componentName: 'url-component',
        componentVersion: '2.0.0'
      };
      req.body = { 
        packageJson: { 
          name: 'url-component', 
          version: '2.0.0' 
        } 
      };
      await validateRoute(req, res);
    });

    it('should return 200 status', () => {
      expect(statusStub.calledWith(200)).to.be.true;
    });

    it('should return success message', () => {
      expect(resJsonStub.calledWith({
        valid: true,
        message: 'Package validation successful'
      })).to.be.true;
    });
  });
});
